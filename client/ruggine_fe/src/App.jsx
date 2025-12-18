import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';

import API from './API/API.mjs';
import DefaultLayout from './components/DefaultLayout';
import { LoginForm } from './components/AuthComponents';
import Home from './components/Home';
import InvitationModal from './components/InvitationModal';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState(null);
  const [user, setUser] = useState({});
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [groups, setGroups] = useState([]);
  const [ws, setWs] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await API.getUserInfo();
        setLoggedIn(true);
        setUser(u);
      } catch { }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (loggedIn) {
      API.getRequests()
        .then(setInvitations)
        .catch(() => setInvitations([]));
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;

    const wsUrl = "/ws/notifications";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WS notifications connected");
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        console.log("WS message received", msg);
        if (msg.type === "invitation.created") {
          const invite = {
            id: msg.data.request_id,
            sent_at: msg.data.sent_at,
            from: {
              id: msg.data.from.id,
              name: msg.data.from.name,
              username: msg.data.from.username,
            },
            group: {
              id: msg.data.group.id,
              name: msg.data.group.name,
              created_at: msg.data.group.created_at,
            },
          };
          setInvitations((prev) => [invite, ...prev]);
        }
      } catch (e) {
        console.error("Error parsing WS message", e);
      }
    };

    socket.onerror = (err) => {
      console.error("WS error", err);
    };

    socket.onclose = () => {
      console.log("WS notifications closed");
    };

    setWs(socket);

    return () => {
      socket.close();
      setWs(null);
    };
  }, [loggedIn]);

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
  const handleInvitationClick = (inv) => {
    setSelectedInvite(inv);
  };

  const handleAcceptInvite = async () => {
    const newGroup = await API.patchRequest(selectedInvite.id, "accept");

    handleGroupCreated(newGroup);

    setInvitations(inv =>
      inv.filter(i => i.id !== selectedInvite.id)
    );

    setSelectedInvite(null);
  };

  const handleRejectInvite = async () => {
    await API.patchRequest(selectedInvite.id, "reject");

    setInvitations(inv =>
      inv.filter(i => i.id !== selectedInvite.id)
    );

    setSelectedInvite(null);
  };

  const handleGroupCreated = (group) => {
    setGroups(gs => [group, ...gs]);
  };

  return (
    <>
      <Routes>
        <Route
          element={
            <DefaultLayout
              loggedIn={loggedIn}
              user={user}
              message={message}
              setMessage={setMessage}
              handleLogout={handleLogout}
              invitations={invitations}
              onInvitationClick={handleInvitationClick}
            />
          }
        >

          <Route
            path="/"
            element={
              loggedIn ? <Home user={user} groups={groups} setGroups={setGroups} handleGroupCreated={handleGroupCreated} /> : <Navigate to="/login" replace />
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
      <InvitationModal
        invite={selectedInvite}
        onAccept={handleAcceptInvite}
        onReject={handleRejectInvite}
        onClose={() => setSelectedInvite(null)}
      />
    </>
  );
}

export default App;
