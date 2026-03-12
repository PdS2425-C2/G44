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

  const moveGroupToTop = (chatId) => {
    setGroups((prevGroups) => {
      const chatIndex = prevGroups.findIndex(g => g.id === chatId);
      if (chatIndex > -1) {
        const newGroups = [...prevGroups];
        const [chatToMove] = newGroups.splice(chatIndex, 1);
        return [chatToMove, ...newGroups];
      }
      return prevGroups;
    });
  };

  useEffect(() => {
    if (!incomingMessage) return;
    moveGroupToTop(incomingMessage.chat_id);
  }, [incomingMessage]);

  const addGroup = (group) => setGroups((prev) => [group, ...prev]);

  return { groups, loadingGroups, groupsError, addGroup, moveGroupToTop };
};