import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { loggedIn } = useAuth();
  
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);

  const [incomingMessage, setIncomingMessage] = useState(null);

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

  useEffect(() => {
    if (!loggedIn) return;

    const socket = new WebSocket('ws://localhost:3000/ws/notifications'); 

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
            chat: {
              id: msg.data.chat.id,
              name: msg.data.chat.name,
              created_at: msg.data.chat.created_at,
            },
          };
          setInvitations((prev) => [invite, ...prev]);
        } 
        else if (msg.type === 'message.received') {
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
        incomingMessage,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);