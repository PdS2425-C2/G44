import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { loggedIn } = useAuth();
  
  // Stati per gli inviti
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);

  // --- NUOVO STATO: L'ultimo messaggio di chat ricevuto ---
  const [incomingMessage, setIncomingMessage] = useState(null);

  // fetch richieste / inviti all'accesso
  useEffect(() => {
    if (!loggedIn) {
      setInvitations([]);
      setSelectedInvite(null);
      return;
    }

    API.getRequests()
      .then(setInvitations)
      .catch(() => setInvitations([]));
  }, [loggedIn]);

  // websocket notifiche e messaggi
  useEffect(() => {
    if (!loggedIn) return;

    // Nota: in produzione potresti voler usare l'URL completo (ws://...) o farti restituire l'host dinamicamente
    const socket = new WebSocket('ws://localhost:3000/ws/notifications'); // <-- Assicurati che l'URL sia corretto per il tuo ambiente

    socket.onopen = () => console.log('WS notifications connected');

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('WS message received', msg);
        
        // 1. GESTIONE INVITI AI GRUPPI
        if (msg.type === 'invitation.created') {
          const invite = {
            id: msg.data.request_id,
            sent_at: msg.data.sent_at,
            from: {
              id: msg.data.from.id,
              name: msg.data.from.name,
              username: msg.data.from.username,
            },
            chat: {
              id: msg.data.chat.id,
              name: msg.data.chat.name,
              created_at: msg.data.chat.created_at,
            },
          };
          setInvitations((prev) => [invite, ...prev]);
        } 
        // 2. --- NUOVA GESTIONE: MESSAGGI CHAT RICEVUTI ---
        else if (msg.type === 'message.received') {
            // Salviamo il messaggio nello stato. 
            // La ChatRoom sarà in ascolto di questo stato.
            setIncomingMessage(msg.data);
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    socket.onerror = (err) => console.error('WS error', err);
    socket.onclose = () => console.log('WS notifications closed');

    return () => socket.close();
  }, [loggedIn]);

  const removeInvitation = (id) =>
    setInvitations((prev) => prev.filter((i) => i.id !== id));

  return (
    <NotificationsContext.Provider
      value={{
        invitations,
        selectedInvite,
        setSelectedInvite,
        removeInvitation,
        // --- ESPONIAMO IL NUOVO STATO ---
        incomingMessage,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);