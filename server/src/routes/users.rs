use axum::{
    extract::{Query, State},
    Json,
};

use crate::{
    auth::verify_cookie_value,
    error::ApiError,
    routes::dto::{UserDto, UsersQuery},
    state::AppState,
};

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
    let pattern_name = pattern.clone();

    let users = sqlx::query!(
        r#"
        SELECT id, name, username
        FROM user
        WHERE (username LIKE ? OR name LIKE ?)
        AND id != ?
        ORDER BY username
        LIMIT ?
        "#,
        pattern,
        pattern_name,
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