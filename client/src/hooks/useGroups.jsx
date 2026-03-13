// useGroups.jsx
import { useEffect, useState } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth'; 
import { useNotifications } from './NotificationsProvider'; 

export const useGroupsState = () => {
  const { loggedIn } = useAuth();
  const { incomingMessage } = useNotifications(); 
  
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  useEffect(() => {
    // ... (la logica di loadGroups rimane identica a prima)
    if (!loggedIn) {  
      setGroups([]);
      setLoadingGroups(false);
      return;
    }

    let cancelled = false;
    const loadGroups = async () => {
      try {
        const gs = await API.getGroups();
        if (!cancelled) {
          setGroups(gs);
          setLoadingGroups(false);
        }
      } catch (err) {
        if (!cancelled) {
          setGroupsError(err.message || 'Errore nel caricamento gruppi');
          setLoadingGroups(false);
        }
      }
    };
    loadGroups();
    return () => { cancelled = true; };
  }, [loggedIn]);  

  // --- NUOVA FUNZIONE: Sposta in cima e aggiorna il testo ---
  const updateGroupActivity = (chatId, message) => {
    setGroups((prevGroups) => {
      const chatIndex = prevGroups.findIndex(g => g.id === chatId);
      if (chatIndex > -1) {
        const newGroups = [...prevGroups];
        const chatToUpdate = { ...newGroups[chatIndex] }; // cloniamo per non mutare lo stato originario
        
        // AGGIORNIAMO L'ULTIMO MESSAGGIO
        chatToUpdate.last_message = {
            content: message.content,
            sent_at: message.sent_at,
            sender_name: message.from?.name || message.from?.username || ''
        };

        // Rimuoviamo la vecchia posizione e lo mettiamo in cima
        newGroups.splice(chatIndex, 1);
        return [chatToUpdate, ...newGroups];
      }
      return prevGroups;
    });
  };

  // Quando arriva un messaggio via WebSocket aggiorniamo subito!
  useEffect(() => {
    if (!incomingMessage) return;
    updateGroupActivity(incomingMessage.chat_id, incomingMessage);
  }, [incomingMessage]);

  const addGroup = (group) => setGroups((prev) => [group, ...prev]);

  // Esportiamo la nuova funzione
  return { groups, loadingGroups, groupsError, addGroup, updateGroupActivity };
};