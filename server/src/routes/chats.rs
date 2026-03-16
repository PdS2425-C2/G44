use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tower_cookies::Cookies;

use crate::{
    auth::{uid_from_cookies, verify_cookie_value},
    error::ApiError,
    state::AppState,
};

// --------- DTOs ---------

#[derive(Debug, Serialize)]
pub struct LastMessageDto {
    pub content: String,
    pub sent_at: String,
    pub sender_name: String,
}

#[derive(Debug, Serialize)]
pub struct ChatDto {
    pub id: i64,
    pub name: Option<String>,
    pub created_at: String,
    pub is_group: bool,
    pub last_message: Option<LastMessageDto>,
    pub unread_count: i64, // <-- NUOVO CAMPO PER IL BADGE
}

#[derive(Debug, Serialize)]
pub struct ParticipantDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct CreateChatReq {
    pub name: String,
}

#[derive(Deserialize)]
pub struct CreatePrivateChatReq {
    pub username: String,
}

// GET /api/chats
// Returns all chats the user belongs to (ORA CON IL CONTEGGIO MESSAGGI NON LETTI)
pub async fn get_chats(
    State(st): State<AppState>,
    cookies: Cookies,
    Query(params): Query<ChatsQuery>,
) -> Result<Json<Vec<ChatDto>>, ApiError> {
    let sid_cookie = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload = verify_cookie_value(sid_cookie.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);

    let rows = sqlx::query!(
        r#"
        SELECT
            c.id AS "id!: i64",
            (
                CASE
                WHEN c.is_group = 1 THEN COALESCE(c.name, '')
                ELSE COALESCE(u_other.name, u_other.username, '')
                END
            ) AS "name!: String",
            c.created_at AS created_at,
            c.is_group AS "is_group!: bool",
            lm.content AS "last_message_content?: String",
            lm.sent_at AS "last_message_sent_at?: String",
            lm.sender_name AS "last_message_sender_name?: String",
            (
                -- Conta i messaggi inviati DOPO l'ultima lettura (o dopo l'ingresso se mai letta)
                SELECT COUNT(m.id)
                FROM message m
                WHERE m.chat_id = c.id
                AND m.sent_at > COALESCE(a_me.last_read_at, a_me.join_at)
            ) AS "unread_count!: i64"
        FROM chat c
        JOIN association a_me
            ON a_me.chat_id = c.id
            AND a_me.user_id = ?
        LEFT JOIN association a_other
            ON a_other.chat_id = c.id
            AND a_other.user_id != ?
        LEFT JOIN user u_other
            ON u_other.id = a_other.user_id
        LEFT JOIN (
            SELECT m1.chat_id, m1.content, m1.sent_at, COALESCE(u.name, u.username, '') AS sender_name
            FROM message m1
            JOIN user u ON u.id = m1.user_id
            WHERE m1.id = (
                SELECT m2.id 
                FROM message m2 
                WHERE m2.chat_id = m1.chat_id 
                ORDER BY m2.sent_at DESC 
                LIMIT 1
            )
        ) lm ON lm.chat_id = c.id
        ORDER BY COALESCE(lm.sent_at, c.created_at) DESC
        LIMIT ? OFFSET ?
        "#,
        user_id,
        user_id,
        limit,
        offset
    )
    .fetch_all(&st.pool)
    .await?;

    let chats = rows
        .into_iter()
        .map(|r| {
            let last_message = match (
                r.last_message_content,
                r.last_message_sent_at,
                r.last_message_sender_name,
            ) {
                (Some(content), Some(sent_at), Some(sender_name)) => Some(LastMessageDto {
                    content,
                    sent_at,
                    sender_name,
                }),
                _ => None,
            };

            ChatDto {
                id: r.id,
                name: if r.name.is_empty() {
                    None
                } else {
                    Some(r.name)
                },
                created_at: r.created_at,
                is_group: r.is_group,
                last_message,
                unread_count: r.unread_count, // <-- Mappiamo il nuovo campo
            }
        })
        .collect();

    Ok(Json(chats))
}

// POST /api/chats
pub async fn post_chats(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(req): Json<CreateChatReq>,
) -> Result<Json<ChatDto>, ApiError> {
    if req.name.trim().is_empty() { return Err(ApiError::BadRequest("chat name missing")); }

    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload = verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    let chat = sqlx::query!(
        r#"INSERT INTO chat(name, created_at, is_group) VALUES (?, datetime('now'), 1) RETURNING id, name, created_at, is_group"#,
        req.name
    ).fetch_one(&mut *tx).await?;

    // Per chi crea la chat, l'ultima lettura coincide con la creazione
    sqlx::query!(
        r#"INSERT INTO association(user_id, chat_id, join_at, last_read_at) VALUES (?, ?, datetime('now'), datetime('now'))"#,
        user_id, chat.id
    ).execute(&mut *tx).await?;

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

// POST /api/chats/private
pub async fn post_private_chat(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(req): Json<CreatePrivateChatReq>,
) -> Result<Json<ChatDto>, ApiError> {
    if req.username.trim().is_empty() { return Err(ApiError::BadRequest("username missing")); }

    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload = verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    let other = sqlx::query!("SELECT id, name, username FROM user WHERE username = ?", req.username)
        .fetch_optional(&mut *tx).await?.ok_or(ApiError::NotFound)?;
    let other_id = other.id.ok_or(ApiError::Internal)?;

    // evita chat con se stessi
    if other_id == user_id {
        return Err(ApiError::BadRequest(
            "Non puoi creare una chat privata con te stesso",
        ));
    }

    let existing = sqlx::query!(
        "SELECT c.id FROM chat c JOIN association a1 ON a1.chat_id = c.id AND a1.user_id = ? JOIN association a2 ON a2.chat_id = c.id AND a2.user_id = ? WHERE c.is_group = 0 LIMIT 1",
        user_id, other_id
    ).fetch_optional(&mut *tx).await?;

    if existing.is_some() { return Err(ApiError::BadRequest("La chat privata esiste già")); }

    let chat = sqlx::query!("INSERT INTO chat(name, created_at, is_group) VALUES (NULL, datetime('now'), 0) RETURNING id, name, created_at, is_group")
        .fetch_one(&mut *tx).await?;

    sqlx::query!("INSERT INTO association(user_id, chat_id, join_at, last_read_at) VALUES (?, ?, datetime('now'), datetime('now'))", user_id, chat.id)
        .execute(&mut *tx).await?;

    sqlx::query!("INSERT INTO association(user_id, chat_id, join_at) VALUES (?, ?, datetime('now'))", other_id, chat.id)
        .execute(&mut *tx).await?;

    tx.commit().await?;

    let other_display_name = if other.name.trim().is_empty() {
        other.username.clone()
    } else {
        other.name.clone()
    };

    Ok(Json(ChatDto {
        id: chat.id,
        name: Some(other_display_name),
        created_at: chat.created_at,
        is_group: chat.is_group,
        last_message: None,
        unread_count: 0,
    }))
}

// GET /api/chats/<chat_id>/participants
pub async fn get_chat_participants(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
) -> Result<Json<Vec<ParticipantDto>>, ApiError> {
    let sid_cookie = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid_cookie.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let in_chat = sqlx::query!("SELECT user_id FROM association WHERE user_id = ? AND chat_id = ?", user_id, chat_id)
        .fetch_optional(&st.pool).await?;

    if in_chat.is_none() { return Err(ApiError::Forbidden); }

    let rows = sqlx::query!(
        r#"SELECT u.id AS "id!: i64", COALESCE(u.name, u.username, '') AS "name!: String", u.username AS "username!: String" FROM user u JOIN association a ON a.user_id = u.id WHERE a.chat_id = ?"#,
        chat_id
    ).fetch_all(&st.pool).await?;

    let participants = rows.into_iter().map(|r| ParticipantDto { id: r.id, name: r.name, username: r.username }).collect();
    Ok(Json(participants))
}

// PATCH /api/chats/<chat_id>/read
pub async fn patch_chat_read(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
) -> Result<Json<()>, ApiError> {
    let sid_cookie = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload = verify_cookie_value(sid_cookie.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let result = sqlx::query!(
        "UPDATE association SET last_read_at = datetime('now') WHERE user_id = ? AND chat_id = ?",
        user_id,
        chat_id
    )
    .execute(&st.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::Forbidden); 
    }

    Ok(Json(()))
}

// DELETE /api/chats/:chat_id/members/me
// Removes the authenticated user from a group chat.
// Private chats cannot be left (403).
pub async fn leave_chat(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(chat_id): Path<i64>,
) -> Result<StatusCode, ApiError> {
    let user_id = uid_from_cookies(&cookies, &st.cookie_secret).ok_or(ApiError::Unauthorized)?;

    // Single query: fetch chat and verify membership in one round-trip.
    // Returns (is_group, is_member) so we can give the right error in each case.
    let row = sqlx::query!(
        r#"
        SELECT
            c.is_group        AS "is_group!: bool",
            a.user_id IS NOT NULL AS "is_member!: bool"
        FROM chat c
        LEFT JOIN association a
            ON a.chat_id = c.id
            AND a.user_id = ?
        WHERE c.id = ?
        "#,
        user_id,
        chat_id
    )
    .fetch_optional(&st.pool)
    .await?
    .ok_or(ApiError::NotFound)?; // chat does not exist

    if !row.is_member {
        return Err(ApiError::Forbidden); // user is not in this chat
    }

    if !row.is_group {
        return Err(ApiError::Forbidden); // cannot leave a private chat
    }

    sqlx::query!(
        "DELETE FROM association WHERE user_id = ? AND chat_id = ?",
        user_id,
        chat_id
    )
    .execute(&st.pool)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
