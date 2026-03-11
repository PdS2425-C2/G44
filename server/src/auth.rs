use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionPayload {
    pub uid: i64,
    pub exp: u64,
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn sign(payload_json: &[u8], secret: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(secret).expect("bad HMAC key");
    mac.update(payload_json);
    mac.finalize().into_bytes().to_vec()
}

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

pub fn verify_cookie_value(value: &str, secret: &[u8]) -> Option<SessionPayload> {
    let (a, b) = value.split_once('.')?;
    let payload_json = URL_SAFE_NO_PAD.decode(a).ok()?;
    let sig = URL_SAFE_NO_PAD.decode(b).ok()?;

    let expected = sign(&payload_json, secret);
    if expected != sig {
        return None;
    }

    let payload: SessionPayload = serde_json::from_slice(&payload_json).ok()?;
    if payload.exp < now_unix() {
        return None;
    }

    Some(payload)
}
