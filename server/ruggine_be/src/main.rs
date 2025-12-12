// import dei moduli
mod auth;
mod error;
mod routes;
mod state;

use axum::{routing::{get, post, delete}, Router};
use sqlx::sqlite::SqlitePoolOptions;                // serve per creare una connection pool
use state::AppState;                                // stato globale clonato e condiviso tra tutte le request
use tower_cookies::CookieManagerLayer;              // layer di tower che gestisce i cookie
use tower_http::trace::{TraceLayer, DefaultMakeSpan, DefaultOnResponse};
use tracing::Level;
use tracing_subscriber::{fmt, EnvFilter};


fn init_tracing() {
    // Se non setti RUST_LOG, questo è il default:
    // - tower_http=info per vedere le richieste
    // - ruggine_be=debug per i tuoi log se vuoi
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
    // carico le variabili d'ambiente e setto l'url del db e il secret per i cookie. 
    dotenvy::dotenv().ok(); 
    init_tracing();
                   

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://data/ruggine.db".to_string());

    let cookie_secret = std::env::var("COOKIE_SECRET")
        .expect("COOKIE_SECRET missing (set env var, long random string)");

    let run_addr = std::env::var("RUN_IP")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_string());
    
    // creazione della pool di sql lite
    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect(&db_url)
        .await
        .expect("DB connect failed");

    // creazione dello stato
    let st = AppState {
        pool,
        cookie_secret: cookie_secret.into_bytes(),
        session_ttl_secs: 60 * 60 * 24, // 24h
    };
    
    // router axum
    let app = Router::new()
        .route("/api/sessions", post(routes::sessions::post_sessions))
        .route("/api/sessions", get(routes::sessions::get_sessions))
        .route("/api/sessions", delete(routes::sessions::delete_sessions))
        .route("/api/groups", get(routes::groups::get_groups))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)), 
        )       
        .layer(CookieManagerLayer::new())
        .with_state(st);

    // avvio del server
    let listener = tokio::net::TcpListener::bind(&run_addr).await.unwrap();
    tracing::info!("Listening on {}", run_addr);
    axum::serve(listener, app).await.unwrap();

}
