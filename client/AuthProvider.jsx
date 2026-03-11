import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null); // opzionale, per messaggi globali
  const navigate = useNavigate();

  // check auth iniziale
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
    try {
      const u = await API.logIn(credentials);
      setLoggedIn(true);
      setUser(u);
      setMessage({ msg: `Benvenuto ${u.name}!`, type: 'success' });
      navigate('/', { replace: true });
      return { ok: true };
    } catch (err) {
      setMessage({
        msg: 'Username o password non corretti, riprovare!',
        type: 'danger',
      });
      return { ok: false, error: err };
    }
  };

  const logOut = async () => {
    await API.logOut();
    setLoggedIn(false);
    setUser(null);
    setMessage({ msg: 'Arrivederci!', type: 'info' });
    navigate('/login', { replace: true });
  };

  const clearMessage = () => setMessage(null);

  return (
    <AuthContext.Provider
      value={{ loggedIn, user, logIn, logOut, message, clearMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
