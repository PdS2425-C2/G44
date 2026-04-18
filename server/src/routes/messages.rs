use axum::extract::ws::Message;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::json;

use crate::{
    auth::AuthUser,
    error::ApiError,
    routes::{
        chats::is_chat_member,
        dto::{CreateMessageReq, MessageDto, UserDto},
    },
    state::AppState,
};

/// GET /api/chats/:chat_id/messages — return all messages in the chat, ordered by time.
pub async fn get_messages(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
) -> Result<Json<Vec<MessageDto>>, ApiError> {
    if !is_chat_member(&st.pool, auth.user_id, chat_id).await? {
        return Err(ApiError::Forbidden);
    }

    let rows = sqlx::query!(
        r#"
        SELECT m.id, m.content, m.sent_at,
               u.id       AS user_id,
               u.name     AS user_name,
               u.username AS user_username
        FROM message m
        JOIN user u ON u.id = m.user_id
        WHERE m.chat_id = ?
        ORDER BY m.sent_at ASC
        "#,
        chat_id
    )
    .fetch_all(&st.pool)
    .await?;

    let messages = rows
        .into_iter()
        .map(|r| MessageDto {
            id: r.id,
            from: UserDto {
                id: r.user_id,
                name: r.user_name,
                username: r.user_username,
            },
            chat_id,
            content: r.content,
            sent_at: r.sent_at,
        })
        .collect();

    Ok(Json(messages))
}

/// POST /api/chats/:chat_id/messages — send a message and push it to all other members via WebSocket.
pub async fn post_message(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
    Json(req): Json<CreateMessageReq>,
) -> Result<StatusCode, ApiError> {
    if req.content.trim().is_empty() {
        return Err(ApiError::BadRequest("message content is required"));
    }

    if !is_chat_member(&st.pool, auth.user_id, chat_id).await? {
        return Err(ApiError::Forbidden);
    }

    let mut tx = st.pool.begin().await?;

    let record = sqlx::query!(
        r#"INSERT INTO message(chat_id, user_id, content, sent_at)
           VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
           RETURNING id, chat_id, user_id, content, sent_at"#,
        chat_id,
        auth.user_id,
        req.content
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    let sender = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        auth.user_id
    )
    .fetch_one(&st.pool)
    .await?;

    let payload = json!({
        "type": "message.received",
        "data": {
            "id": record.id,
            "from": {
                "id": sender.id,
                "name": sender.name,
                "username": sender.username,
            },
            "chat_id": chat_id,
            "content": record.content,
            "sent_at": record.sent_at,
        }
    });

    // Collect the other chat members and push the message to their WebSocket connections.
    let others = sqlx::query!(
        "SELECT user_id FROM association WHERE chat_id = ? AND user_id != ?",
        chat_id,
        auth.user_id
    )
    .fetch_all(&st.pool)
    .await?;

    let recipient_ids: Vec<i64> = others.into_iter().map(|r| r.user_id).collect();
    st.notify_users(&recipient_ids, Message::Text(payload.to_string()))
        .await;

    Ok(StatusCode::CREATED)
}
