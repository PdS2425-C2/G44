use sqlx::SqlitePool;

/*
   Stato globale dell'applicazione, condiviso tra tutte le request.
   Contiene:
   - pool di connessioni al database
   - secret per firmare i cookie di sessione
   - durata della sessione in secondi
*/
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secret: Vec<u8>,
    pub session_ttl_secs: u64,
}
