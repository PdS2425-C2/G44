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

  // Moves the updated chat to the top of the list and bumps its unread counter,
  // mirroring the behaviour of most messaging apps without a full refetch.
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

        // Splice out and prepend so the most recently active chat always appears first
        newGroups.splice(chatIndex, 1);
        return [chatToUpdate, ...newGroups];
      }

      // Chat not yet in the list (e.g. first message in a brand-new private chat):
      // construct a minimal entry so the sidebar updates immediately
      const newChat = {
        id: chatId,
        name: message.chat_name || message.from?.name || 'Nuova chat',
        is_group: message.is_group ?? false,
        unread_count: isReadByMe ? 0 : 1,
        last_message: {
          content: message.content,
          sent_at: message.sent_at,
          sender_name: message.from?.name || message.from?.username || ''
        }
      };

      return [newChat, ...prevGroups];
    });
  }, []);

  // Called when the user opens a chat to clear its badge without a round-trip
  const resetUnreadCount = useCallback((chatId) => {
    setGroups((prevGroups) =>
      prevGroups.map(g => g.id === chatId ? { ...g, unread_count: 0 } : g)
    );
  }, []);

  // Sync the sidebar whenever a new message arrives via WebSocket
  useEffect(() => {
    if (!incomingMessage) return;
    updateGroupActivity(incomingMessage.chat_id, incomingMessage, false);
  }, [incomingMessage, updateGroupActivity]);

  const addGroup = useCallback((group) => setGroups((prev) => [group, ...prev]), []);

  const removeGroup = useCallback((chatId) => {
    setGroups((prev) => prev.filter((g) => g.id !== chatId));
  }, []);

  return {
    groups,
    loadingGroups,
    groupsError,
    addGroup,
    updateGroupActivity,
    resetUnreadCount,
    removeGroup,
    refreshGroups: fetchGroups
  };
};