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
#[derive(Deserialize)]
pub struct CreateGroupReq {
    pub name: String,
    pub invitees: Vec<String>,
}

// GET /api/groups
// Returns all groups the user belongs to
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
        ORDER BY g.created_at DESC
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

// POST /api/groups
// Creates a new group and invites the specified users
pub async fn post_groups(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(req): Json<CreateGroupReq>,
) -> Result<Json<GroupDto>, ApiError> {

    if req.name.trim().is_empty() {
        return Err(ApiError::BadRequest("group name missing"));
    }

    // --- auth ---
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    // create group
    let group = sqlx::query!(
        r#"INSERT INTO "group"(name, created_at)
           VALUES (?, datetime('now'))
           RETURNING id, name, created_at"#,
        req.name
    )
    .fetch_one(&mut *tx)
    .await?;

    // group creator association
    sqlx::query!(
        r#"INSERT INTO association(user_id, group_id, join_at)
           VALUES (?, ?, datetime('now'))"#,
        user_id,
        group.id
    )
    .execute(&mut *tx)
    .await?;

    // user invitations
    for username in req.invitees {
        let user = sqlx::query!(
            r#"SELECT id FROM user WHERE username = ?"#,
            username
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(ApiError::BadRequest("user not found"))?;

        sqlx::query!(
            r#"INSERT INTO request(group_id, inviter_id, invitee_id, created_at)
               VALUES (?, ?, ?, datetime('now'))"#,
            group.id,
            user_id,
            user.id
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(Json(GroupDto {
        id: group.id,
        name: group.name,
        created_at: group.created_at,
    }))
}