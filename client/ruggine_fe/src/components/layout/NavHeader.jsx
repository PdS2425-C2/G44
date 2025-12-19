import {
  Navbar,
  Nav,
  Button,
  Container,
  Dropdown,
  Badge,
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
      <Container>
        <Navbar.Brand href="/">
          🦀 Ruggine
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto" />

          {loggedIn && (
            <div className="d-flex align-items-center gap-3">
              {/* NOTIFICHE */}
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-light" id="dropdown-invitations">
                  <i className="bi bi-bell"></i>{' '}
                  {invitations.length > 0 && (
                    <Badge bg="danger" pill>
                      {invitations.length}
                    </Badge>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Header>Inviti</Dropdown.Header>
                  {invitations.length === 0 ? (
                    <Dropdown.ItemText>Nessun invito</Dropdown.ItemText>
                  ) : (
                    invitations.map((inv) => (
                      <Dropdown.Item
                        key={inv.id}
                        onClick={() => setSelectedInvite(inv)}
                      >
                        <div className="fw-semibold">{inv.group.name}</div>
                        <small className="text-muted">
                          da {inv.from.username}
                        </small>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>

              {/* USER + LOGOUT */}
              <span className="text-light">
                {user?.name || user?.username}
              </span>
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleLogout}
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
