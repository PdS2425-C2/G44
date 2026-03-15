import { useEffect, useState, useCallback } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth'; 
import { useNotifications } from './NotificationsProvider'; 

export const useGroupsState = () => {
  const { loggedIn } = useAuth();
  const { incomingMessage } = useNotifications(); 
  
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      const gs = await API.getGroups();
      setGroups(gs);
    } catch (err) {
      setGroupsError(err.message || 'Errore nel caricamento gruppi');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) {  
      setGroups([]);
      setLoadingGroups(false);
      return;
    }
    
    fetchGroups();
  }, [loggedIn, fetchGroups]);  

  const updateGroupActivity = useCallback((chatId, message, isReadByMe = false) => {
    setGroups((prevGroups) => {
      const chatIndex = prevGroups.findIndex(g => g.id === chatId);
      if (chatIndex > -1) {
        const newGroups = [...prevGroups];
        const chatToUpdate = { ...newGroups[chatIndex] }; 
        
        chatToUpdate.last_message = {
            content: message.content,
            sent_at: message.sent_at,
            sender_name: message.from?.name || message.from?.username || ''
        };

        if (!isReadByMe) {
            chatToUpdate.unread_count = (chatToUpdate.unread_count || 0) + 1;
        }

        newGroups.splice(chatIndex, 1);
        return [chatToUpdate, ...newGroups];
      }
      return prevGroups;
    });
  }, []);

  const resetUnreadCount = useCallback((chatId) => {
      setGroups((prevGroups) => 
          prevGroups.map(g => g.id === chatId ? { ...g, unread_count: 0 } : g)
      );
  }, []);

  useEffect(() => {
    if (!incomingMessage) return;
    updateGroupActivity(incomingMessage.chat_id, incomingMessage, false);
  }, [incomingMessage, updateGroupActivity]);

  const addGroup = useCallback((group) => setGroups((prev) => [group, ...prev]), []);

  return { 
    groups, 
    loadingGroups, 
    groupsError, 
    addGroup, 
    updateGroupActivity, 
    resetUnreadCount,
    refreshGroups: fetchGroups
  };
};