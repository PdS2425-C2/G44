use argon2::{Argon2, PasswordVerifier};
use axum::{Json, extract::State, http::StatusCode};
use password_hash::PasswordHash;
use tower_cookies::{Cookie, Cookies};

use crate::{
    auth::{AuthUser, make_cookie_value},
    error::ApiError,
    routes::dto::{LoginReq, UserDto},
    state::AppState,
};

const SID_COOKIE: &str = "sid";

fn add_session_cookie(cookies: &Cookies, value: String) {
    let mut c = Cookie::new(SID_COOKIE, value);
    c.set_http_only(true);
    c.set_same_site(tower_cookies::cookie::SameSite::Lax);
    c.set_path("/");
    // c.set_secure(true); — enable when running behind HTTPS
    cookies.add(c);
}

fn remove_session_cookie(cookies: &Cookies) {
    let mut c = Cookie::new(SID_COOKIE, "");
    c.set_path("/");
    c.make_removal();
    cookies.add(c);
}

/// POST /api/sessions — verify credentials and issue a session cookie.
pub async fn post_sessions(
    State(st): State<AppState>,
    cookies: Cookies,
    Json(req): Json<LoginReq>,
) -> Result<Json<UserDto>, ApiError> {
    if req.username.trim().is_empty() || req.password.is_empty() {
        return Err(ApiError::BadRequest("username and password are required"));
    }

    let row = sqlx::query!(
        r#"SELECT id, name, username, password_hash FROM user WHERE username = ?"#,
        req.username
    )
    .fetch_optional(&st.pool)
    .await?
    .ok_or(ApiError::Unauthorized)?;

    let user_id = row.id.ok_or(ApiError::Internal)?;

    let parsed = PasswordHash::new(&row.password_hash).map_err(|_| ApiError::Internal)?;
    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed)
        .map_err(|_| ApiError::Unauthorized)?;

    let sid = make_cookie_value(user_id, st.session_ttl_secs, &st.cookie_secret);
    add_session_cookie(&cookies, sid);

    Ok(Json(UserDto {
        id: user_id,
        name: row.name,
        username: row.username,
    }))
}

/// GET /api/sessions — return the currently authenticated user (whoami).
pub async fn get_sessions(
    State(st): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserDto>, ApiError> {
    let row = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        auth.user_id
    )
    .fetch_optional(&st.pool)
    .await?
    .ok_or(ApiError::Unauthorized)?;

    Ok(Json(UserDto {
        id: row.id,
        name: row.name,
        username: row.username,
    }))
}

/// DELETE /api/sessions — clear the session cookie (logout).
pub async fn delete_sessions(cookies: Cookies) -> StatusCode {
    remove_session_cookie(&cookies);
    StatusCode::NO_CONTENT
}
