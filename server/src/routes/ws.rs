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
use tower_cookies::Cookies;

use crate::{auth, state::AppState};

pub async fn ws_notifications(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    cookies: Cookies,
) -> impl IntoResponse {
    let sid: String = match cookies.get("sid") {
        Some(c) => c.value().to_string(),
        None => return ws.on_upgrade(|socket| async move { drop(socket) }),
    };

    let payload = match auth::verify_cookie_value(&sid, &state.cookie_secret) {
        Some(p) => p,
        None => return ws.on_upgrade(|socket| async move { drop(socket) }),
    };

    let user_id = payload.uid;
    let conn_id = state.next_conn_id.fetch_add(1, Ordering::Relaxed);

    ws.on_upgrade(move |socket| handle_notifications_socket(socket, state, user_id, conn_id))
}

async fn handle_notifications_socket(
    socket: WebSocket,
    state: AppState,
    user_id: i64,
    conn_id: u64,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // canale interno (tx per chi invia notifiche, rx collegato al websocket)
    let (tx, mut rx) = mpsc::unbounded::<Message>();

    // registra il sender nel registry
    {
        let mut peers = state.notification_peers.write().await;
        peers
            .entry(user_id)
            .or_insert_with(HashMap::new)
            .insert(conn_id, tx);
    }

    // Task 1: inoltra i messaggi dal canale interno al WebSocket
    let forward_to_ws = tokio::spawn(async move {
        while let Some(msg) = rx.next().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Task 2: leggi eventuali messaggi dal client (qui li ignoriamo)
    while let Some(Ok(msg)) = ws_receiver.next().await {
        if let Message::Close(_) = msg {
            break;
        }
    }
    forward_to_ws.abort();

    // Task 3: rimuovi il sender dal registry
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
