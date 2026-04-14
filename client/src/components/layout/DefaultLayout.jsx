import { useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';

import NavHeader from './NavHeader';
import { useAuth } from '../../hooks/useAuth';

const DefaultLayout = ({ children, hideNav = false, invitations = [] }) => {
  const { loggedIn, user, logOut, message, clearMessage } = useAuth();

  useEffect(() => {
    if (!message) return;

    const timeout =
      message.type === 'danger'
        ? 7000
        : 3000;

    const t = setTimeout(() => clearMessage(), timeout);
    return () => clearTimeout(t);
  }, [message, clearMessage]);

  return (
    <div className="d-flex flex-column vh-100">
      {!hideNav && (
        <NavHeader
          loggedIn={loggedIn}
          user={user}
          handleLogout={logOut}
          invitations={invitations}
        />
      )}

      {message && (
        <Container fluid className="mt-2">
          <Alert
            variant={message.type}
            dismissible
            onClose={clearMessage}
          >
            {message.msg}
          </Alert>
        </Container>
      )}

      <main className="flex-grow-1 overflow-hidden p-0">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default DefaultLayout;