import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // checkAuth iniziale
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await API.getUserInfo();
        setLoggedIn(true);
        setUser(u);
      } catch {
        setLoggedIn(false);
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const logIn = async (credentials) => {
    const u = await API.logIn(credentials);
    console.log('Logged in user:', u);
    setLoggedIn(true);
    setUser(u);
    return u;
  };

  const logOut = async () => {
    await API.logOut();
    setLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, user, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
