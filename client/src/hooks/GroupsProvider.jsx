import { createContext, useContext } from 'react';
import { useGroupsState } from '../hooks/useGroups';

const GroupsContext = createContext(null);

export const GroupsProvider = ({ children }) => {
  const value = useGroupsState();
  return (
    <GroupsContext.Provider value={value}>
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroups = () => {
  const ctx = useContext(GroupsContext);
  if (!ctx) {
    throw new Error('useGroups deve essere usato dentro <GroupsProvider>');
  }
  return ctx;
};