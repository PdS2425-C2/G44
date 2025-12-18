use axum::extract::ws::Message;
use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_cookies::Cookies;

use crate::{auth::verify_cookie_value, error::ApiError, state::AppState};

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
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;

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
                group: GroupDto {
                    id: r.group_id,
                    name: r.group_name,
                    created_at: r.group_created,
                },
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
pub struct PostRequestBody {
    pub username: String,
}

pub async fn post_group_request(
    State(st): State<AppState>,
    cookies: Cookies,
    Path(group_id): Path<i64>,
    Json(body): Json<PostRequestBody>,
) -> Result<(), ApiError> {
    // 1. auth inviter
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
    let inviter_id = payload.uid;

    let mut tx = st.pool.begin().await?;

    // 2. trova invitee + group + inserisci richiesta
    // (pseudo-SQL, adatta ai tuoi nomi reali)
    let invitee = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE username = ?"#,
        body.username
    )
    .fetch_one(&mut *tx)
    .await?;

    let group = sqlx::query!(
        r#"SELECT id, name, created_at FROM "group" WHERE id = ?"#,
        group_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let inviter = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        inviter_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let req = sqlx::query!(
        r#"INSERT INTO request(inviter_id, invitee_id, group_id, created_at)
           VALUES (?, ?, ?, datetime('now'))
           RETURNING id, created_at"#,
        inviter_id,
        invitee.id,
        group_id
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    // 3. costruisci il payload WS secondo il formato richiesto
    let notif = json!({
        "type": "invitation.created",
        "data": {
            "request_id": req.id,
            "from": {
                "id": inviter.id,
                "name": inviter.name,
                "username": inviter.username,
            },
            "group": {
                "id": group.id,
                "name": group.name,
                "created_at": group.created_at, // già String nel tuo DTO
            },
            "sent_at": req.created_at,
        }
    });

    let msg = Message::Text(notif.to_string());

    // 4. se l'invitato è connesso al WS notifiche, invia
    {
        let peers = st.notification_peers.read().await;
        if let Some(senders) = peers.get(&invitee.id.unwrap()) {
            for tx in senders {
                // se uno fallisce, continui sugli altri
                let _ = tx.unbounded_send(msg.clone());
            }
        }
    }

    Ok(())
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
) -> Result<Json<GroupDto>, ApiError> {
    let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret).ok_or(ApiError::Unauthorized)?;
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

        // Get the group
        let group = sqlx::query!(
            r#"SELECT id, name, created_at FROM "group" WHERE id = ?"#,
            req.group_id
        )
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
            .execute(&mut *tx)
            .await?;

        return Ok(Json(GroupDto {
            id: group.id,
            name: group.name,
            created_at: group.created_at,
        }));
    }

    sqlx::query!(r#"DELETE FROM request WHERE id = ?"#, request_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(Json(GroupDto {
        id: -1,
        name: "".to_string(),
        created_at: "".to_string(),
    }))
}
