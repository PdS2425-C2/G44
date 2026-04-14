import {
  Navbar,
  Nav,
  Button,
  Container,
  Dropdown,
} from 'react-bootstrap';
import { useNotifications } from '../../hooks/NotificationsProvider';

const NavHeader = ({
  loggedIn,
  user,
  handleLogout,
  invitations = [],
}) => {
  const { setSelectedInvite } = useNotifications();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container fluid>
        <Navbar.Brand href="/">
          🦀 Ruggine
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto" />

          {loggedIn && (
            <div className="d-flex align-items-center gap-3">
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-light" id="dropdown-invitations">
                  <i className="bi bi-bell"></i>{' '}
                  {invitations.length > 0 && (
                    <span 
                      className="badge rounded-pill ms-1" 
                      style={{ backgroundColor: '#e65a41', color: 'white' }}
                    >
                      {invitations.length}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu 
                  className="shadow rounded-4 border-0 mt-2" 
                  style={{ minWidth: '280px', padding: '0.5rem 0' }}
                >
                  <Dropdown.Header 
                    className="fw-bold text-uppercase mb-1" 
                    style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}
                  >
                    Inviti in sospeso
                  </Dropdown.Header>
                  
                  {invitations.length === 0 ? (
                    <Dropdown.ItemText className="text-center text-muted py-4">
                      <i className="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>
                      Nessun invito
                    </Dropdown.ItemText>
                  ) : (
                    invitations.map((inv) => (
                      <Dropdown.Item
                        key={inv.id}
                        onClick={() => setSelectedInvite(inv)}
                        className="d-flex align-items-center gap-3 py-2 px-3"
                      >
                        <div
                          className="d-flex justify-content-center align-items-center rounded-circle flex-shrink-0"
                          style={{ width: '40px', height: '40px', backgroundColor: '#fbece9', color: '#e65a41' }}
                        >
                          <i className="bi bi-envelope-paper-fill fs-5"></i>
                        </div>
                        <div className="overflow-hidden">
                          <div className="fw-bold text-dark text-truncate">{inv.chat.name}</div>
                          <small className="text-muted d-block text-truncate">
                            da <span style={{ color: '#e65a41', fontWeight: '500' }}>@{inv.from.username}</span>
                          </small>
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>

              <span className="text-light fw-medium">
                {user?.name || user?.username}
              </span>
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleLogout}
                className="rounded-pill px-3 fw-semibold"
              >
                Logout
              </Button>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavHeader;