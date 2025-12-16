use axum::{
    extract::{Path, State},
    Json,
};
use serde::{ Serialize, Deserialize };
use tower_cookies::Cookies;

use crate::{
    auth::verify_cookie_value,
    error::ApiError,
    state::AppState,
};

#[derive(Serialize)]
pub struct RequestDto {
    pub id: i64,
    pub sent_at: String,
    pub from: UserDto,
    pub group: GroupDto,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

#[derive(Serialize)]
pub struct GroupDto {
    pub id: i64,
    pub name: String,
    pub created_at: String,
}

pub async fn get_requests(
    State(st): State<AppState>,
    cookies: Cookies,
) -> Result<Json<Vec<RequestDto>>, ApiError> {

    // auth
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;

    let rows = sqlx::query!(
        r#"
        SELECT
          r.id,
          r.created_at AS sent_at,
          u.id AS from_id,
          u.name AS from_name,
          u.username AS from_username,
          g.id AS group_id,
          g.name AS group_name,
          g.created_at AS group_created
        FROM request r
        JOIN user u ON r.inviter_id = u.id
        JOIN "group" g ON r.group_id = g.id
        WHERE r.invitee_id = ?
        ORDER BY r.created_at DESC
        "#,
        payload.uid
    )
    .fetch_all(&st.pool)
    .await?;

    Ok(Json(rows.into_iter().map(|r| RequestDto {
        id: r.id,
        sent_at: r.sent_at,
        from: UserDto {
            id: r.from_id,
            name: r.from_name,
            username: r.from_username,
        },
        group: GroupDto {
            id: r.group_id,
            name: r.group_name,
            created_at: r.group_created,
        },
    }).collect()))
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
) -> Result<(), ApiError> {

    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;
    let user_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    let req = sqlx::query!(
        r#"SELECT group_id FROM request WHERE id = ? AND invitee_id = ?"#,
        request_id,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(ApiError::NotFound)?;

    if body.status == "accept" {
        sqlx::query!(
            r#"INSERT INTO association(user_id, group_id, join_at)
               VALUES (?, ?, datetime('now'))"#,
            user_id,
            req.group_id
        )
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query!(
        r#"DELETE FROM request WHERE id = ?"#,
        request_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}