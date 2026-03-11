use axum::extract::ws::Message;
use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tower_cookies::Cookies;
use serde_json::json;
use crate::{
    auth::verify_cookie_value,
    error::ApiError,
    state::AppState,
};


// --------- DTOs ---------
#[derive(Deserialize)]
pub struct CreateMessageReq {
    pub content: String,
}

#[derive(Serialize, Clone)]
pub struct MessageDto {
    pub id: i64,
    pub from: UserDto,
    pub chat_id: i64,
    pub content: String,
    pub sent_at: String,
}

#[derive(Serialize, Clone)]
pub struct UserDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

// Check if user belongs to chat
async fn check_user_in_chat(st: &AppState, user_id: i64, chat_id: i64) -> Result<bool, ApiError> {
    let row = sqlx::query!(
        r#"
        SELECT user_id
        FROM association
        WHERE user_id = ? AND chat_id = ?
        "#,
        user_id,
        chat_id
    )
    .fetch_optional(&st.pool)
    .await?;

    Ok(row.is_some())
}

// GET /api/chats/<chat_id>/messages
// Returns all messages in a chat
pub async fn get_messages(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
) -> Result<Json<Vec<MessageDto>>, ApiError> {
    // --- 1) Recovery user_id from cookie ---
    let sid_cookie = cookies
        .get("sid")
        .ok_or(ApiError::Unauthorized)?;

    let payload = verify_cookie_value(sid_cookie.value(), &st.cookie_secret)
        .ok_or(ApiError::Unauthorized)?;

    let user_id = payload.uid;

    // --- 2) Check if user belongs to the chat ---
    if !check_user_in_chat(&st, user_id, chat_id).await? {
        return Err(ApiError::Forbidden);
    }

    // --- 3) Query SQL ---
    // Select all the messages of a chat
    let rows = sqlx::query!(
        r#"
        SELECT m.id, m.content, m.sent_at, u.id as user_id, u.name as user_name, u.username as user_username
        FROM message m
        JOIN user u ON u.id = m.user_id
        WHERE m.chat_id = ?
        ORDER BY m.sent_at ASC
        "#,
        chat_id
    )
    .fetch_all(&st.pool)
    .await?;

    // --- 4) DTO mapping ---
    let messages = rows
        .into_iter()
        .map(|r| MessageDto {
            id: r.id,
            from: UserDto {
                id: r.user_id,
                name: r.user_name,
                username: r.user_username,
            },
            chat_id: chat_id,
            content: r.content,
            sent_at: r.sent_at,
        })
        .collect();

    Ok(Json(messages))
}

// POST /api/chats/<chat_id>/messages
// Send a new message in a chat
pub async fn post_message(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
    Json(req): Json<CreateMessageReq>,
) -> Result<StatusCode, ApiError>{

    if req.content.trim().is_empty() {
        return Err(ApiError::BadRequest("message content missing"));
    }

    // --- auth ---
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    if !check_user_in_chat(&st, user_id, chat_id).await? {
        return Err(ApiError::Forbidden);
    }
    
    // create message
    let message_record = sqlx::query!(
        r#"INSERT INTO message(chat_id, user_id, content, sent_at)
           VALUES (?, ?, ?, datetime('now'))
           RETURNING id, chat_id, user_id, content, sent_at"#,
        chat_id,
        user_id,
        req.content
    )
    .fetch_one(&mut *tx)
    .await?;


    tx.commit().await?;

    let sender = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        user_id
    )
    .fetch_one(&st.pool)
    .await?;

    // build WS message
    let message = json!({
        "type": "message.received",
        "data": {
            "id": message_record.id,
            "from": {
                "id": sender.id,
                "name": sender.name,
                "username": sender.username,
            },
            "chat_id": chat_id,
            "content": message_record.content,
            "sent_at": message_record.sent_at,
        }
    });
    let msg = Message::Text(message.to_string());

    // all partecipants of the chat
    let partecipants = sqlx::query!(
        r#"
        SELECT user_id
        FROM association
        WHERE chat_id = ? AND user_id != ?
        "#,
        chat_id,
        user_id
    )
    .fetch_all(&st.pool)
    .await?;

    // check WS connections of all partecipants and send the message
    {
        let peers = st.notification_peers.read().await;
        for p in partecipants {
            if let Some(senders) = peers.get(&p.user_id) {
                for tx in senders.values() {
                    // se uno fallisce, continui sugli altri
                    let _ = tx.unbounded_send(msg.clone());
                }
            }
        }
    }

    Ok(StatusCode::CREATED)
}
