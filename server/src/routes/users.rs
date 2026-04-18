use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};

use argon2::{Argon2, PasswordHasher};
use password_hash::SaltString;
use rand::rngs::OsRng;
use tower_cookies::{Cookie, Cookies};

use crate::{
    auth::{make_cookie_value, verify_cookie_value},
    error::ApiError,
    routes::dto::{RegisterReq, UserDto, UsersQuery},
    state::AppState,
};

const SID_COOKIE: &str = "sid";

fn add_session_cookie(cookies: &Cookies, value: String) {
    let mut c = Cookie::new(SID_COOKIE, value);
    c.set_http_only(true);
    c.set_same_site(tower_cookies::cookie::SameSite::Lax);
    c.set_path("/");
    cookies.add(c);
}

pub async fn get_users(
    State(st): State<AppState>,
    cookies: Cookies,
    Query(params): Query<UsersQuery>,
) -> Result<Json<Vec<UserDto>>, ApiError> {
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

pub async fn post_users(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(body): Json<RegisterReq>,
) -> Result<(StatusCode, Json<UserDto>), ApiError> {
    let name = body.name.trim();
    let username = body.username.trim();
    let password = body.password;

    if name.is_empty() {
        return Err(ApiError::BadRequest("Il nome è obbligatorio"));
    }

    if username.is_empty() {
        return Err(ApiError::BadRequest("Lo username è obbligatorio"));
    }

    if username.len() < 3 {
        return Err(ApiError::BadRequest(
            "Lo username deve contenere almeno 3 caratteri",
        ));
    }

    if password.len() < 6 {
        return Err(ApiError::BadRequest(
            "La password deve contenere almeno 6 caratteri",
        ));
    }

    let existing = sqlx::query!(
        r#"
        SELECT id
        FROM user
        WHERE username = ?
        "#,
        username
    )
    .fetch_optional(&st.pool)
    .await?;

    if existing.is_some() {
        return Err(ApiError::BadRequest("Username già in uso"));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| ApiError::Internal)?
        .to_string();

    let result = sqlx::query!(
        r#"
        INSERT INTO user (name, username, password_hash)
        VALUES (?, ?, ?)
        "#,
        name,
        username,
        password_hash
    )
    .execute(&st.pool)
    .await?;

    let user_id = result.last_insert_rowid();

    let sid = make_cookie_value(user_id, st.session_ttl_secs, &st.cookie_secret);
    add_session_cookie(&cookies, sid);

    Ok((
        StatusCode::CREATED,
        Json(UserDto {
            id: user_id,
            name: name.to_string(),
            username: username.to_string(),
        }),
    ))
}