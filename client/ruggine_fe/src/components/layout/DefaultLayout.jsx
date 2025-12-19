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
    <>
      {!hideNav && (
        <NavHeader
          loggedIn={loggedIn}
          user={user}
          handleLogout={logOut}
          invitations={invitations}
        />
      )}

      {message && (
        <Container className="mt-2">
          <Alert
            variant={message.type}
            dismissible
            onClose={clearMessage}
          >
            {message.msg}
          </Alert>
        </Container>
      )}

      <Container className="mt-3">
        {children || <Outlet />}
      </Container>
    </>
  );
};

export default DefaultLayout;
