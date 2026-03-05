use sqlx::SqlitePool;
use std::{collections::HashMap, sync::{Arc, atomic::AtomicU64}};
use tokio::sync::RwLock;
use axum::extract::ws::Message;
use futures::channel::mpsc::UnboundedSender;

/*
   Stato globale dell'applicazione, condiviso tra tutte le request.
   Contiene:
   - pool di connessioni al database
   - secret per firmare i cookie di sessione
   - durata della sessione in secondi
   - i WS aperti per utente
*/
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secret: Vec<u8>,
    pub session_ttl_secs: u64,
    pub notification_peers: Arc<RwLock<HashMap<i64, HashMap<u64, UnboundedSender<Message>>>>>,
    pub next_conn_id: Arc<AtomicU64>,
}
