use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::verify_cookie_value,
    error::ApiError,
    state::AppState,
};

#[derive(Deserialize)]
pub struct UsersQuery {
    pub query: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

pub async fn get_users(
    State(st): State<AppState>,
    cookies: tower_cookies::Cookies,
    Query(params): Query<UsersQuery>,
) -> Result<Json<Vec<UserDto>>, ApiError> {

    // auth
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;
    let my_id = payload.uid;

    let q = params.query.unwrap_or_default();
    let limit = params.limit.unwrap_or(10);

    let pattern = format!("%{}%", q);

    let users = sqlx::query!(
        r#"
        SELECT id, name, username
        FROM user
        WHERE username LIKE ?
        AND id != ?
        ORDER BY username
        LIMIT ?
        "#,
        pattern,
        my_id,
        limit
    )
    .fetch_all(&st.pool)
    .await?;

    Ok(Json(
        users.into_iter().map(|u| UserDto {
            id: u.id.unwrap(),
            name: u.name,
            username: u.username,
        }).collect()
    ))
}