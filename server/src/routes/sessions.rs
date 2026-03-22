use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use crate::{
    auth::{make_cookie_value, verify_cookie_value},
    error::ApiError,
    routes::dto::{LoginReq, UserDto},
    state::AppState,
};

use tower_cookies::{Cookie, Cookies};
use argon2::{Argon2, PasswordVerifier};
use password_hash::PasswordHash;


const SID_COOKIE: &str = "sid"; // nome del cookie di sessione

// --------- Funzioni helper per gestire i cookie di sessione ---------

// Aggiunge un cookie di sessione alla risposta
fn add_session_cookie(cookies: &Cookies, value: String) {
    let mut c = Cookie::new(SID_COOKIE, value);
    c.set_http_only(true);
    c.set_same_site(tower_cookies::cookie::SameSite::Lax);
    c.set_path("/");
    // c.set_secure(true); // abilita quando sei in HTTPS
    cookies.add(c);
}

// Rimuove il cookie di sessione dalla risposta
fn remove_session_cookie(cookies: &Cookies) {
    let mut c = Cookie::new(SID_COOKIE, "");
    c.set_path("/");
    c.make_removal();
    cookies.add(c);
}

// --------- API Handlers ---------

/// POST /api/sessions  (login)
pub async fn post_sessions(
    State(st): State<AppState>, // stato globale
    cookies: Cookies, 			// gestore dei cookie
    Json(req): Json<LoginReq>,  // corpo della request
) -> Result<Json<UserDto>, ApiError> {
    if req.username.trim().is_empty() || req.password.is_empty() {
        return Err(ApiError::BadRequest("username/password missing"));
    }

    let row = sqlx::query!(
        r#"SELECT id, name, username, password_hash FROM user WHERE username = ?"#,
        req.username
    )
    .fetch_optional(&st.pool) 
    .await?
    .ok_or(ApiError::Unauthorized)?;

	// recupero l'id utente dal db
    let user_id = row.id.ok_or(ApiError::Internal)?;

    let parsed = PasswordHash::new(&row.password_hash)
        .map_err(|_| ApiError::Internal)?;
    
	// verifica della password
	Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed)
        .map_err(|_| ApiError::Unauthorized)?;

	// creo il cookie di sessione
    let sid = make_cookie_value(user_id, st.session_ttl_secs, &st.cookie_secret);

	// aggiungo il cookie alla risposta
    add_session_cookie(&cookies, sid);

    Ok(Json(UserDto {
        id: user_id,
        name: row.name,
        username: row.username,
    }))
}

/// GET /api/sessions  (whoami)
pub async fn get_sessions(
    State(st): State<AppState>, // stato globale
    cookies: Cookies, 			// gestore dei cookie
) -> Result<Json<UserDto>, ApiError> {
    let sid = cookies.get(SID_COOKIE).ok_or(ApiError::Unauthorized)?;

	// verifico e decodifico il cookie di sessione
    let payload =
        verify_cookie_value(sid.value(), &st.cookie_secret)
            .ok_or(ApiError::Unauthorized)?;

    let row = sqlx::query!(
        r#"SELECT id, name, username FROM user WHERE id = ?"#,
        payload.uid
    )
    .fetch_optional(&st.pool) 
    .await?
    .ok_or(ApiError::Unauthorized)?;

	// recupero l'id utente dal db
    let user_id = row.id;

    Ok(Json(UserDto {
        id: user_id,
        name: row.name,
        username: row.username,
    }))
}

/// DELETE /api/sessions (logout)
pub async fn delete_sessions(
    cookies: Cookies, // gestore dei cookie
) -> Result<StatusCode, ApiError> {
	// rimuovo il cookie di sessione
    remove_session_cookie(&cookies);
    Ok(StatusCode::NO_CONTENT)
}
