use axum::{
    Json,
    extract::{Query, State},
};

use crate::{
    auth::AuthUser,
    error::ApiError,
    routes::dto::{UserDto, UsersQuery},
    state::AppState,
};

/// GET /api/users — search users by username or display name, excluding the caller.
pub async fn get_users(
    State(st): State<AppState>,
    auth: AuthUser,
    Query(params): Query<UsersQuery>,
) -> Result<Json<Vec<UserDto>>, ApiError> {
    let q = params.query.unwrap_or_default();
    let limit = params.limit.unwrap_or(10);
    let pattern = format!("%{}%", q);

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
        pattern,
        auth.user_id,
        limit
    )
    .fetch_all(&st.pool)
    .await?;

    Ok(Json(
        users
            .into_iter()
            .map(|u| UserDto {
                id: u.id.unwrap(),
                name: u.name,
                username: u.username,
            })
            .collect(),
    ))
}
