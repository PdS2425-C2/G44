use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use tower_cookies::Cookies;

use crate::{
    auth::verify_cookie_value,
    error::ApiError,
    state::AppState,
};

// --------- DTOs ---------
#[derive(Debug, Serialize)]
pub struct ChatDto {
    pub id: i64,
    pub name: Option<String>,
    pub created_at: String,
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

// GET /api/chats
// Returns all chats the user belongs to
pub async fn get_chats(
    State(st): State<AppState>,
    cookies: Cookies,
    Query(params): Query<ChatsQuery>,
) -> Result<Json<Vec<ChatDto>>, ApiError> {
    // --- 1) Recupero cookie di sessione ---
    let sid_cookie = cookies
        .get("sid")
        .ok_or(ApiError::Unauthorized)?;

    let payload = verify_cookie_value(sid_cookie.value(), &st.cookie_secret)
        .ok_or(ApiError::Unauthorized)?;

    let user_id = payload.uid;

    // --- 2) Parametri opzionali ---
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);

    // --- 3) Query SQL ---
    let rows = sqlx::query!(
        r#"
        SELECT c.id, c.name, c.created_at
        FROM chat c
        JOIN association a ON a.chat_id = c.id
        WHERE a.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        "#,
        user_id,
        limit,
        offset
    )
    .fetch_all(&st.pool)
    .await?;

    // --- 4) Conversione in DTO ---
    let chats = rows
        .into_iter()
        .map(|r| ChatDto {
            id: r.id.expect("chat id missing"),
            name: r.name,
            created_at: r.created_at,
        })
        .collect();

    Ok(Json(chats))
}

// POST /api/chats
// Creates a new chat and invites the specified users
pub async fn post_chats(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(req): Json<CreateChatReq>,
) -> Result<Json<ChatDto>, ApiError> {

    if req.name.trim().is_empty() {
        return Err(ApiError::BadRequest("chat name missing"));
    }

    // --- auth ---
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    // create chat
    let chat = sqlx::query!(
        r#"INSERT INTO chat(name, created_at, is_group)
           VALUES (?, datetime('now'), 1)
           RETURNING id, name, created_at, is_group"#,
        req.name
    )
    .fetch_one(&mut *tx)
    .await?;

    // chat creator association
    sqlx::query!(
        r#"INSERT INTO association(user_id, chat_id, join_at)
           VALUES (?, ?, datetime('now'))"#,
        user_id,
        chat.id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(ChatDto {
        id: chat.id,
        name: chat.name,
        created_at: chat.created_at,
    }))
}