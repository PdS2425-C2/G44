use std::{collections::HashMap, sync::atomic::Ordering};

use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures::channel::mpsc;
use futures::{SinkExt, StreamExt};

use crate::{auth::AuthUser, state::AppState};

/// GET /ws/notifications — upgrade the connection to a WebSocket and register it
/// in the notification registry so the server can push events to this client.
pub async fn ws_notifications(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    let conn_id = state.next_conn_id.fetch_add(1, Ordering::Relaxed);
    ws.on_upgrade(move |socket| handle_notifications_socket(socket, state, auth.user_id, conn_id))
}

async fn handle_notifications_socket(
    socket: WebSocket,
    state: AppState,
    user_id: i64,
    conn_id: u64,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Internal channel: other tasks write to `tx`; this task drains `rx` into the WebSocket.
    let (tx, mut rx) = mpsc::unbounded::<Message>();

    {
        let mut peers = state.notification_peers.write().await;
        peers
            .entry(user_id)
            .or_insert_with(HashMap::new)
            .insert(conn_id, tx);
    }

    // Forward messages from the internal channel to the WebSocket.
    let forward = tokio::spawn(async move {
        while let Some(msg) = rx.next().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Drain incoming frames; abort on close.
    while let Some(Ok(msg)) = ws_receiver.next().await {
        if let Message::Close(_) = msg {
            break;
        }
    }
    forward.abort();

    // Deregister this connection and clean up empty user entries.
    {
        let mut peers = state.notification_peers.write().await;
        if let Some(conns) = peers.get_mut(&user_id) {
            conns.remove(&conn_id);
            if conns.is_empty() {
                peers.remove(&user_id);
            }
        }
    }
}
