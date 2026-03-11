use axum::extract::ws::Message;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_cookies::Cookies;

use crate::{auth::verify_cookie_value, error::ApiError, state::AppState};

#[derive(Serialize)]
pub struct RequestDto {
    pub id: i64,
    pub sent_at: String,
    pub from: UserDto,
    pub chat: ChatDto,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

#[derive(Serialize)]
pub struct ChatDto {
    pub id: i64,
    pub name: Option<String>,
    pub created_at: String,
}

pub async fn get_requests(
    State(st): State<AppState>,
    cookies: Cookies,
) -> Result<Json<Vec<RequestDto>>, ApiError> {
    // auth
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;

    let rows = sqlx::query!(
        r#"
        SELECT
          r.id,
          r.created_at AS sent_at,
          u.id AS from_id,
          u.name AS from_name,
          u.username AS from_username,
          c.id AS chat_id,
          c.name AS chat_name,
          c.created_at AS chat_created
        FROM request r
        JOIN user u ON r.inviter_id = u.id
        JOIN chat c ON r.chat_id = c.id
        WHERE r.invitee_id = ?
        ORDER BY r.created_at DESC
        "#,
        payload.uid
    )
    .fetch_all(&st.pool)
    .await?;

    Ok(Json(
        rows.into_iter()
            .map(|r| RequestDto {
                id: r.id,
                sent_at: r.sent_at,
                from: UserDto {
                    id: r.from_id,
                    name: r.from_name,
                    username: r.from_username,
                },
                chat: ChatDto {
                    id: r.chat_id,
                    name: r.chat_name,
                    created_at: r.chat_created,
                },
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
pub struct PostRequestBody {
    pub username: String,
}

pub async fn post_chat_request(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
    Json(body): Json<PostRequestBody>,
) -> Result<StatusCode, ApiError> {
    // 1. auth inviter
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let inviter_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    // 2. trova invitee + chat + inserisci richiesta
    // (pseudo-SQL, adatta ai tuoi nomi reali)
    let invitee = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE username = ?"#,
        body.username
    )
    .fetch_one(&mut *tx)
    .await?;

    let chat = sqlx::query!(
        r#"SELECT id, name, created_at FROM chat WHERE id = ?"#,
        chat_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let inviter = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        inviter_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let req = sqlx::query!(
        r#"INSERT INTO request(inviter_id, invitee_id, chat_id, created_at)
           VALUES (?, ?, ?, datetime('now'))
           RETURNING id, created_at"#,
        inviter_id,
        invitee.id,
        chat_id
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    // 3. costruisci il payload WS secondo il formato richiesto
    let notif = json!({
        "type": "invitation.created",
        "data": {
            "request_id": req.id,
            "from": {
                "id": inviter.id,
                "name": inviter.name,
                "username": inviter.username,
            },
            "chat": {
                "id": chat.id,
                "name": chat.name,
                "created_at": chat.created_at, // già String nel tuo DTO
            },
            "sent_at": req.created_at,
        }
    });

    let msg = Message::Text(notif.to_string());

    // 4. se l'invitato è connesso al WS notifiche, invia
    {
        let peers = st.notification_peers.read().await;
        if let Some(senders) = peers.get(&invitee.id.unwrap()) {
            for tx in senders.values() {
                // se uno fallisce, continui sugli altri
                let _ = tx.unbounded_send(msg.clone());
            }
        }
    }

    Ok(StatusCode::NO_CONTENT)

}

#[derive(Deserialize)]
pub struct PatchReq {
    pub status: String, // "accept" | "reject"
}

pub async fn patch_request(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(request_id): Path<i64>,
    Json(body): Json<PatchReq>,
) -> Result<Json<ChatDto>, ApiError> {
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    let req = sqlx::query!(
        r#"SELECT chat_id FROM request WHERE id = ? AND invitee_id = ?"#,
        request_id,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound)?;

    if body.status == "accept" {
        sqlx::query!(
            r#"INSERT INTO association(user_id, chat_id, join_at)
               VALUES (?, ?, datetime('now'))"#,
            user_id,
            req.chat_id
        )
        .execute(&mut *tx)
        .await?;

        // Get the chat
        let chat = sqlx::query!(
            r#"SELECT id, name, created_at FROM chat WHERE id = ?"#,
            req.chat_id
        )
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;


        return Ok(Json(ChatDto {
            id: chat.id,
            name: chat.name,
            created_at: chat.created_at,
        }));
    }

    sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(Json(ChatDto {
        id: -1,
        name: None,
        created_at: "".to_string(),
    }))
}
