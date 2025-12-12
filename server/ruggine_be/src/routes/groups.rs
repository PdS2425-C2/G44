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
pub struct GroupDto {
    pub id: i64,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct GroupsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// GET /api/groups
// Ritorna tutti i gruppi a cui l'utente appartiene
pub async fn get_groups(
    State(st): State<AppState>,
    cookies: Cookies,
    Query(params): Query<GroupsQuery>,
) -> Result<Json<Vec<GroupDto>>, ApiError> {
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
        SELECT g.id, g.name, g.created_at
        FROM "group" g
        JOIN association a ON a.group_id = g.id
        WHERE a.user_id = ?
        ORDER BY g.created_at ASC
        LIMIT ? OFFSET ?
        "#,
        user_id,
        limit,
        offset
    )
    .fetch_all(&st.pool)
    .await?;

    // --- 4) Conversione in DTO ---
    let groups = rows
        .into_iter()
        .map(|r| GroupDto {
            id: r.id.expect("group id missing"),
            name: r.name,
            created_at: r.created_at,
        })
        .collect();

    Ok(Json(groups))
}