import { Alert, Container } from 'react-bootstrap';
import { Outlet } from 'react-router';
import NavHeader from './NavHeader';
import { useEffect } from 'react';

function DefaultLayout({ loggedIn, user, handleLogout, message, setMessage, invitations, onInvitationClick }) {
  useEffect(() => { 
    if (message) { 
      if (message.type === 'danger') {
        const t = setTimeout(() => setMessage(null), 7000); 
        return () => clearTimeout(t);
      }
      
      const t = setTimeout(() => setMessage(null), 3000); 
      return () => clearTimeout(t);
    } 
  }, [message, setMessage]);

  return (
    <>
      {loggedIn && <NavHeader loggedIn={loggedIn} user={user} handleLogout={handleLogout} invitations={invitations} onInvitationClick={onInvitationClick} />}

      {message && (
        <Alert variant={message.type || 'info'}
               className="position-fixed top-0 start-50 translate-middle-x mt-3 shadow"
               style={{ zIndex: 1060, minWidth: '320px', maxWidth: '90%' }}>
          {message.msg}
        </Alert>
      )}

        <Outlet />
    </>
  );
}

export default DefaultLayout;