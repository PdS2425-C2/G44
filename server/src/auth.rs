use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};
use tower_cookies::Cookies;

use crate::{error::ApiError, state::AppState};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionPayload {
    pub uid: i64,
    pub exp: u64,
}

/// Axum extractor that authenticates a request via the signed `sid` session cookie.
/// Handlers that declare `auth: AuthUser` automatically return 401 if the cookie
/// is absent, tampered with, or expired.
pub struct AuthUser {
    pub user_id: i64,
}

#[async_trait::async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let cookies = Cookies::from_request_parts(parts, state)
            .await
            .map_err(|_| ApiError::Internal)?;

        let sid = cookies.get("sid").ok_or(ApiError::Unauthorized)?;
        let payload =
            verify_cookie_value(sid.value(), &state.cookie_secret).ok_or(ApiError::Unauthorized)?;

        Ok(AuthUser {
            user_id: payload.uid,
        })
    }
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn sign(payload_json: &[u8], secret: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(secret).expect("invalid HMAC key length");
    mac.update(payload_json);
    mac.finalize().into_bytes().to_vec()
}

/// Encodes a signed session cookie value containing the user id and an expiry timestamp.
pub fn make_cookie_value(uid: i64, ttl_secs: u64, secret: &[u8]) -> String {
    let payload = SessionPayload {
        uid,
        exp: now_unix() + ttl_secs,
    };
    let payload_json = serde_json::to_vec(&payload).unwrap();
    let sig = sign(&payload_json, secret);

    let a = URL_SAFE_NO_PAD.encode(payload_json);
    let b = URL_SAFE_NO_PAD.encode(sig);
    format!("{a}.{b}")
}

/// Decodes and verifies a raw cookie value.
/// Returns `None` if the signature is invalid or the token is expired.
pub fn verify_cookie_value(value: &str, secret: &[u8]) -> Option<SessionPayload> {
    let (a, b) = value.split_once('.')?;
    let payload_json = URL_SAFE_NO_PAD.decode(a).ok()?;
    let sig = URL_SAFE_NO_PAD.decode(b).ok()?;

    if sign(&payload_json, secret) != sig {
        return None;
    }

    let payload: SessionPayload = serde_json::from_slice(&payload_json).ok()?;
    if payload.exp < now_unix() {
        return None;
    }

    Some(payload)
}
