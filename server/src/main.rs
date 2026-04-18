mod auth;
mod cpu;
mod error;
mod routes;
mod state;

use axum::{
    Router,
    routing::{delete, get, patch, post},
};
use sqlx::sqlite::SqlitePoolOptions;
use state::AppState;
use std::{
    collections::HashMap,
    sync::{Arc, atomic::AtomicU64},
};
use tokio::sync::RwLock;
use tower_cookies::CookieManagerLayer;
use tower_http::trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer};
use tracing::Level;
use tracing_subscriber::{EnvFilter, fmt};

use crate::cpu::start_cpu_logger;

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("tower_http=info,ruggine_be=info"));

    fmt()
        .with_env_filter(filter)
        .with_target(true)
        .compact()
        .init();
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing();
    start_cpu_logger();

    let db_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://data/ruggine.db".to_string());

    let cookie_secret = std::env::var("COOKIE_SECRET").expect("COOKIE_SECRET env var is required");

    let run_addr = std::env::var("RUN_IP").unwrap_or_else(|_| "127.0.0.1:3000".to_string());

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect(&db_url)
        .await
        .expect("failed to connect to database");

    let state = AppState {
        pool,
        cookie_secret: cookie_secret.into_bytes(),
        session_ttl_secs: 60 * 60 * 24,
        notification_peers: Arc::new(RwLock::new(HashMap::new())),
        next_conn_id: Arc::new(AtomicU64::new(0)),
    };

    let app = Router::new()
        .route("/api/sessions", post(routes::sessions::post_sessions))
        .route("/api/sessions", get(routes::sessions::get_sessions))
        .route("/api/sessions", delete(routes::sessions::delete_sessions))
        .route("/api/users", get(routes::users::get_users).post(routes::users::post_users))        
        .route("/api/chats", get(routes::chats::get_chats))
        .route("/api/chats", post(routes::chats::post_chats))
        .route("/api/chats/private", post(routes::chats::post_private_chat))
        .route(
            "/api/chats/:chat_id/messages",
            post(routes::messages::post_message),
        )
        .route(
            "/api/chats/:chat_id/messages",
            get(routes::messages::get_messages),
        )
        .route(
            "/api/chats/:chat_id/requests",
            post(routes::requests::post_chat_request),
        )
        .route(
            "/api/chats/:chat_id/participants",
            get(routes::chats::get_chat_participants),
        )
        .route(
            "/api/chats/:chat_id/members/me",
            delete(routes::chats::leave_chat),
        )
        .route(
            "/api/chats/:chat_id/read",
            patch(routes::chats::patch_chat_read),
        )
        .route("/api/requests", get(routes::requests::get_requests))
        .route("/api/requests/:id", patch(routes::requests::patch_request))
        .route("/ws/notifications", get(routes::ws::ws_notifications))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(CookieManagerLayer::new())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&run_addr).await.unwrap();
    tracing::info!("listening on {}", run_addr);
    axum::serve(listener, app).await.unwrap();
}
