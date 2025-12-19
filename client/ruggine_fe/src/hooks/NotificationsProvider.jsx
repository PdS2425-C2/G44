import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { loggedIn } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);

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

  // websocket notifiche inviti
  useEffect(() => {
    if (!loggedIn) return;

    const socket = new WebSocket('/ws/notifications');

    socket.onopen = () => console.log('WS notifications connected');

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('WS message received', msg);
        if (msg.type === 'invitation.created') {
          const invite = {
            id: msg.data.request_id,
            sent_at: msg.data.sent_at,
            from: {
              id: msg.data.from.id,
              name: msg.data.from.name,
              username: msg.data.from.username,
            },
            group: {
              id: msg.data.group.id,
              name: msg.data.group.name,
              created_at: msg.data.group.created_at,
            },
          };
          setInvitations((prev) => [invite, ...prev]);
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
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
