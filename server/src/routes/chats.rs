use axum::{
    Json,
    extract::{Path, Query, State, ws::Message},
    http::StatusCode,
};
use serde_json::json;
use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::{
    auth::AuthUser,
    error::ApiError,
    routes::dto::{
        ChatDto, ChatsQuery, CreateChatReq, CreatePrivateChatReq, LastMessageDto, ParticipantDto,
    },
    state::AppState,
};

/// Returns `true` if `user_id` is an active member of `chat_id`.
pub(crate) async fn is_chat_member(
    pool: &SqlitePool,
    user_id: i64,
    chat_id: i64,
) -> Result<bool, ApiError> {
    let row = sqlx::query!(
        "SELECT user_id FROM association WHERE user_id = ? AND chat_id = ?",
        user_id,
        chat_id
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.is_some())
}

/// GET /api/chats — return all chats the authenticated user belongs to,
/// including unread message count and last message preview.
pub async fn get_chats(
    State(st): State<AppState>,
    auth: AuthUser,
    Query(params): Query<ChatsQuery>,
) -> Result<Json<Vec<ChatDto>>, ApiError> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);

    let base_rows = sqlx::query!(
        r#"
        SELECT
            c.id        AS "id!: i64",
            c.name      AS "group_name?: String",
            c.created_at AS "created_at!: String",
            c.is_group  AS "is_group!: bool"
        FROM chat c
        JOIN association a_me ON a_me.chat_id = c.id
        WHERE a_me.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        "#,
        auth.user_id,
        limit,
        offset
    )
    .fetch_all(&st.pool)
    .await?;

    if base_rows.is_empty() {
        return Ok(Json(vec![]));
    }

    // For private chats, resolve the other participant's display name.
    let other_user_rows = sqlx::query!(
        r#"
        SELECT
            c.id AS "chat_id!: i64",
            COALESCE(u.name, u.username, '') AS "other_name!: String"
        FROM chat c
        JOIN association a_me   ON a_me.chat_id   = c.id AND a_me.user_id   = ?
        JOIN association a_other ON a_other.chat_id = c.id AND a_other.user_id != ?
        JOIN user u ON u.id = a_other.user_id
        WHERE c.is_group = 0
        "#,
        auth.user_id,
        auth.user_id
    )
    .fetch_all(&st.pool)
    .await?;

    let other_name_by_chat: HashMap<i64, String> = other_user_rows
        .into_iter()
        .map(|r| (r.chat_id, r.other_name))
        .collect();

    // Latest message per chat.
    let last_message_rows = sqlx::query!(
        r#"
        SELECT
            m.chat_id AS "chat_id!: i64",
            m.content AS "content!: String",
            m.sent_at AS "sent_at!: String",
            COALESCE(u.name, u.username, '') AS "sender_name!: String"
        FROM message m
        JOIN user u ON u.id = m.user_id
        WHERE m.id IN (
            SELECT m2.id
            FROM message m2
            JOIN (
                SELECT chat_id, MAX(sent_at) AS max_sent_at
                FROM message
                GROUP BY chat_id
            ) latest ON latest.chat_id = m2.chat_id
                     AND latest.max_sent_at = m2.sent_at
        )
        "#
    )
    .fetch_all(&st.pool)
    .await?;

    let last_message_by_chat: HashMap<i64, LastMessageDto> = last_message_rows
        .into_iter()
        .map(|r| {
            (
                r.chat_id,
                LastMessageDto {
                    content: r.content,
                    sent_at: r.sent_at,
                    sender_name: r.sender_name,
                },
            )
        })
        .collect();

    // Unread message count per chat, measured against the user's last-read timestamp.
    let unread_rows = sqlx::query!(
        r#"
        SELECT
            c.id AS "chat_id!: i64",
            COUNT(m.id) AS "unread_count!: i64"
        FROM chat c
        JOIN association a_me ON a_me.chat_id = c.id AND a_me.user_id = ?
        LEFT JOIN message m
            ON m.chat_id = c.id
            AND m.sent_at > COALESCE(a_me.last_read_at, a_me.join_at)
        GROUP BY c.id
        "#,
        auth.user_id
    )
    .fetch_all(&st.pool)
    .await?;

    let unread_by_chat: HashMap<i64, i64> = unread_rows
        .into_iter()
        .map(|r| (r.chat_id, r.unread_count))
        .collect();

    let chats = base_rows
        .into_iter()
        .map(|r| {
            let name = if r.is_group {
                r.group_name.filter(|n| !n.is_empty())
            } else {
                other_name_by_chat
                    .get(&r.id)
                    .cloned()
                    .filter(|n| !n.is_empty())
            };

            ChatDto {
                id: r.id,
                name,
                created_at: r.created_at,
                is_group: r.is_group,
                last_message: last_message_by_chat.get(&r.id).cloned(),
                unread_count: unread_by_chat.get(&r.id).copied().unwrap_or(0),
            }
        })
        .collect();

    Ok(Json(chats))
}

/// POST /api/chats — create a new group chat; the creator is added as the first member.
pub async fn post_chats(
    State(st): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateChatReq>,
) -> Result<Json<ChatDto>, ApiError> {
    if req.name.trim().is_empty() {
        return Err(ApiError::BadRequest("chat name is required"));
    }

    let mut tx = st.pool.begin().await?;

    let chat = sqlx::query!(
        r#"INSERT INTO chat(name, created_at, is_group)
           VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1)
           RETURNING id, name, created_at, is_group"#,
        req.name
    )
    .fetch_one(&mut *tx)
    .await?;

    // The creator's last_read_at is set to now so they start with zero unread messages.
    sqlx::query!(
        r#"INSERT INTO association(user_id, chat_id, join_at, last_read_at)
           VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"#,
        auth.user_id,
        chat.id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(ChatDto {
        id: chat.id,
        name: chat.name,
        created_at: chat.created_at,
        is_group: chat.is_group,
        last_message: None,
        unread_count: 0,
    }))
}

/// POST /api/chats/private — open a private chat with another user by username.
pub async fn post_private_chat(
    State(st): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreatePrivateChatReq>,
) -> Result<Json<ChatDto>, ApiError> {
    if req.username.trim().is_empty() {
        return Err(ApiError::BadRequest("username is required"));
    }

    let mut tx = st.pool.begin().await?;

    let other = sqlx::query!(
        "SELECT id, name, username FROM user WHERE username = ?",
        req.username
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound)?;

    let other_id = other.id.ok_or(ApiError::Internal)?;

    if other_id == auth.user_id {
        return Err(ApiError::BadRequest(
            "cannot start a private chat with yourself",
        ));
    }

    let existing = sqlx::query!(
        r#"SELECT c.id FROM chat c
           JOIN association a1 ON a1.chat_id = c.id AND a1.user_id = ?
           JOIN association a2 ON a2.chat_id = c.id AND a2.user_id = ?
           WHERE c.is_group = 0
           LIMIT 1"#,
        auth.user_id,
        other_id
    )
    .fetch_optional(&mut *tx)
    .await?;

    if existing.is_some() {
        return Err(ApiError::BadRequest("private chat already exists"));
    }

    let chat = sqlx::query!(
        r#"INSERT INTO chat(name, created_at, is_group)
           VALUES (NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0)
           RETURNING id, name, created_at, is_group"#
    )
    .fetch_one(&mut *tx)
    .await?;

    // Creator reads from now; the other participant has no initial read marker.
    sqlx::query!(
        r#"INSERT INTO association(user_id, chat_id, join_at, last_read_at)
           VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"#,
        auth.user_id,
        chat.id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO association(user_id, chat_id, join_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
        other_id,
        chat.id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let display_name = if other.name.trim().is_empty() {
        other.username
    } else {
        other.name
    };

    Ok(Json(ChatDto {
        id: chat.id,
        name: Some(display_name),
        created_at: chat.created_at,
        is_group: chat.is_group,
        last_message: None,
        unread_count: 0,
    }))
}

/// GET /api/chats/:chat_id/participants — list all members of a chat.
pub async fn get_chat_participants(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
) -> Result<Json<Vec<ParticipantDto>>, ApiError> {
    if !is_chat_member(&st.pool, auth.user_id, chat_id).await? {
        return Err(ApiError::Forbidden);
    }

    let rows = sqlx::query!(
        r#"SELECT u.id AS "id!: i64",
                  COALESCE(u.name, u.username, '') AS "name!: String",
                  u.username AS "username!: String"
           FROM user u
           JOIN association a ON a.user_id = u.id
           WHERE a.chat_id = ?"#,
        chat_id
    )
    .fetch_all(&st.pool)
    .await?;

    let participants = rows
        .into_iter()
        .map(|r| ParticipantDto {
            id: r.id,
            name: r.name,
            username: r.username,
        })
        .collect();

    Ok(Json(participants))
}

/// PATCH /api/chats/:chat_id/read — mark all messages in the chat as read for the caller.
pub async fn patch_chat_read(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
) -> Result<Json<()>, ApiError> {
    let result = sqlx::query!(
        "UPDATE association SET last_read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ? AND chat_id = ?",
        auth.user_id,
        chat_id
    )
    .execute(&st.pool)
    .await?;

    // Zero rows affected means the user is not a member of this chat.
    if result.rows_affected() == 0 {
        return Err(ApiError::Forbidden);
    }

    Ok(Json(()))
}

/// DELETE /api/chats/:chat_id/members/me — leave a group chat.
/// Private chats cannot be left (returns 403).
pub async fn leave_chat(
    State(st): State<AppState>,
    auth: AuthUser,
    Path(chat_id): Path<i64>,
) -> Result<StatusCode, ApiError> {
    let row = sqlx::query!(
        r#"
        SELECT
            c.is_group              AS "is_group!: bool",
            a.user_id IS NOT NULL   AS "is_member!: bool"
        FROM chat c
        LEFT JOIN association a ON a.chat_id = c.id AND a.user_id = ?
        WHERE c.id = ?
        "#,
        auth.user_id,
        chat_id
    )
    .fetch_optional(&st.pool)
    .await?
    .ok_or(ApiError::NotFound)?;

    if !row.is_member {
        return Err(ApiError::Forbidden);
    }

    if !row.is_group {
        return Err(ApiError::Forbidden);
    }

    sqlx::query!(
        "DELETE FROM association WHERE user_id = ? AND chat_id = ?",
        auth.user_id,
        chat_id
    )
    .execute(&st.pool)
    .await?;

    let payload = json!({
        "type": "chat.member_left",
        "data": {
            "chat_id": chat_id,
            "user_id": auth.user_id,
        }
    });

    let others = sqlx::query!(
        "SELECT user_id FROM association WHERE chat_id = ?",
        chat_id
    )
    .fetch_all(&st.pool)
    .await?;

    let recipient_ids: Vec<i64> = others.into_iter().map(|r| r.user_id).collect();

    st.notify_users(&recipient_ids, Message::Text(payload.to_string()))
    .await;

    Ok(StatusCode::NO_CONTENT)
}
