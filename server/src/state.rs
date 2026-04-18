use axum::extract::ws::Message;
use futures::channel::mpsc::UnboundedSender;
use sqlx::SqlitePool;
use std::{
    collections::HashMap,
    sync::{Arc, atomic::AtomicU64},
};
use tokio::sync::RwLock;

/// Shared application state cloned into every request handler.
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secret: Vec<u8>,
    pub session_ttl_secs: u64,
    /// Active WebSocket connections, keyed first by user id then by connection id.
    /// A user can have multiple concurrent connections (e.g. different browser tabs).
    pub notification_peers: Arc<RwLock<HashMap<i64, HashMap<u64, UnboundedSender<Message>>>>>,
    pub next_conn_id: Arc<AtomicU64>,
}

impl AppState {
    /// Sends a WebSocket message to all active connections of the given user.
    pub async fn notify_user(&self, user_id: i64, msg: Message) {
        let peers = self.notification_peers.read().await;
        if let Some(senders) = peers.get(&user_id) {
            for tx in senders.values() {
                let _ = tx.unbounded_send(msg.clone());
            }
        }
    }

    /// Broadcasts a WebSocket message to every user in the provided slice.
    pub async fn notify_users(&self, user_ids: &[i64], msg: Message) {
        let peers = self.notification_peers.read().await;
        for &uid in user_ids {
            if let Some(senders) = peers.get(&uid) {
                for tx in senders.values() {
                    let _ = tx.unbounded_send(msg.clone());
                }
            }
        }
    }
}
