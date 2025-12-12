import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';

import API from './API/API.mjs';
import DefaultLayout from './components/DefaultLayout';
import { LoginForm } from './components/AuthComponents';
import Home from './components/Home';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [message,  setMessage]  = useState(null);
  const [user,     setUser]     = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await API.getUserInfo();
        setLoggedIn(true);
        setUser(u);
      } catch {}
    };
    checkAuth();
  }, []);

  const handleLogin = async (credentials) => {
    try {
      const u = await API.logIn(credentials);
      setLoggedIn(true);
      setUser(u);
      setMessage({ msg: `Benvenuto ${u.name}!`, type: 'success' });
      navigate('/', { replace: true });
    } catch (err) {
      setMessage({ msg: "Username o password non corretti, riprovare!", type: 'danger' });
    }
  };

  const handleLogout = async () => {
    await API.logOut();
    setLoggedIn(false);
    setUser({});
    setMessage({ msg: 'Arrivederci!', type: 'info' });
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route
        element={
          <DefaultLayout
            loggedIn={loggedIn}
            user={user}
            message={message}
            setMessage={setMessage}
            handleLogout={handleLogout}
          />
        }
      >

        <Route
          path="/"
          element={
            loggedIn ? <Home user={user} /> : <Navigate to="/login" replace />
          }
        />


        <Route
          path="/login"
          element={
            loggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <LoginForm handleLogin={handleLogin} />
            )
          }
        />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
