// useGroups.jsx
import { useEffect, useState } from 'react';
import API from '../api/client';
import { useAuth } from './useAuth'; 

export const useGroupsState = () => {
  const { loggedIn } = useAuth();
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

  const addGroup = (group) => setGroups((prev) => [group, ...prev]);

  return { groups, loadingGroups, groupsError, addGroup };
};