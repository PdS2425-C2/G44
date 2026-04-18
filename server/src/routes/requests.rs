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
    routes::dto::{ChatPreviewDto, PatchReq, PostRequestBody, RequestDto, UserDto},
    state::AppState,
};

/// GET /api/requests — return all pending invitations addressed to the caller.
pub async fn get_requests(
    State(st): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<RequestDto>>, ApiError> {
    let rows = sqlx::query!(
        r#"
        SELECT
            r.id,
            r.created_at AS sent_at,
            u.id         AS from_id,
            u.name       AS from_name,
            u.username   AS from_username,
            c.id         AS chat_id,
            c.name       AS chat_name,
            c.created_at AS chat_created
        FROM request r
        JOIN user u ON r.inviter_id = u.id
        JOIN chat c ON r.chat_id    = c.id
        WHERE r.invitee_id = ?
        ORDER BY r.created_at DESC
        "#,
        auth.user_id
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
                chat: ChatPreviewDto {
                    id: r.chat_id,
                    name: r.chat_name,
                    created_at: r.chat_created,
                },
            })
            .collect(),
    ))
}

/// POST /api/chats/:chat_id/requests — invite a user to a group chat.
/// The invitee receives a real-time WebSocket notification.
pub async fn post_chat_request(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
    Json(body): Json<PostRequestBody>,
) -> Result<StatusCode, ApiError> {
    let mut tx = st.pool.begin().await?;

    let invitee = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE username = ?"#,
        body.username
    )
    .fetch_one(&mut *tx)
    .await?;

    // Extract early to avoid an unwrap after the transaction is consumed.
    let invitee_id = invitee.id.ok_or(ApiError::Internal)?;

    let chat = sqlx::query!(
        r#"SELECT id, name, created_at FROM chat WHERE id = ?"#,
        chat_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let inviter = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        auth.user_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let req = sqlx::query!(
        r#"INSERT INTO request(inviter_id, invitee_id, chat_id, created_at)
           VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
           RETURNING id, created_at"#,
        auth.user_id,
        invitee_id,
        chat_id
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    let payload = json!({
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
                "created_at": chat.created_at,
            },
            "sent_at": req.created_at,
        }
    });

    st.notify_user(invitee_id, Message::Text(payload.to_string()))
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// PATCH /api/requests/:id — accept or decline a group invitation.
/// On acceptance, all existing chat members are notified via WebSocket.
pub async fn patch_request(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(request_id): Path<i64>,
    Json(body): Json<PatchReq>,
) -> Result<Json<ChatPreviewDto>, ApiError> {
    let mut tx = st.pool.begin().await?;

    let req = sqlx::query!(
        r#"SELECT chat_id FROM request WHERE id = ? AND invitee_id = ?"#,
        request_id,
        auth.user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound)?;

    if body.status == "accept" {
        sqlx::query!(
            r#"INSERT INTO association(user_id, chat_id, join_at, last_read_at)
               VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"#,
            auth.user_id,
            req.chat_id
        )
        .execute(&mut *tx)
        .await?;

        let chat = sqlx::query!(
            r#"SELECT id, name, created_at FROM chat WHERE id = ?"#,
            req.chat_id
        )
        .fetch_one(&mut *tx)
        .await?;

        let joined_user = sqlx::query!(
            r#"SELECT id, name, username FROM user WHERE id = ?"#,
            auth.user_id
        )
        .fetch_one(&mut *tx)
        .await?;

        let other_members = sqlx::query!(
            r#"SELECT user_id FROM association WHERE chat_id = ? AND user_id != ?"#,
            req.chat_id,
            auth.user_id
        )
        .fetch_all(&mut *tx)
        .await?;

        sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let payload = json!({
            "type": "chat.member_joined",
            "data": {
                "chat_id": req.chat_id,
                "user": {
                    "id": joined_user.id,
                    "name": joined_user.name,
                    "username": joined_user.username
                }
            }
        });

        let member_ids: Vec<i64> = other_members.into_iter().map(|m| m.user_id).collect();
        st.notify_users(&member_ids, Message::Text(payload.to_string()))
            .await;

        return Ok(Json(ChatPreviewDto {
            id: chat.id,
            name: chat.name,
            created_at: chat.created_at,
        }));
    }

    // Decline: simply remove the request.
    sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(Json(ChatPreviewDto {
        id: -1,
        name: None,
        created_at: String::new(),
    }))
}
