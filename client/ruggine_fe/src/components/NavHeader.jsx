import {
  Navbar,
  Nav,
  Button,
  Container,
  Dropdown,
  Badge
} from 'react-bootstrap';

export default function NavHeader({
  loggedIn,
  user,
  handleLogout,
  invitations = [],   // array di inviti
  onInvitationClick   // callback quando clicchi un invito
}) {
  return (
    <Navbar bg="dark" variant="dark" expand="md" className="mb-4 shadow-sm">
      <Container fluid>
        <Navbar.Brand className="fw-bold">
          🦀 Ruggine
        </Navbar.Brand>

        {loggedIn && (
          <Nav className="ms-auto align-items-center gap-3">

            {/* 🔔 NOTIFICHE */}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="dark"
                className="position-relative border-0"
              >
                <i className="bi bi-bell fs-5"></i>

                {invitations.length > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                  >
                    {invitations.length}
                  </Badge>
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow">
                <Dropdown.Header>Inviti</Dropdown.Header>

                {invitations.length === 0 ? (
                  <Dropdown.ItemText className="text-muted">
                    Nessun invito
                  </Dropdown.ItemText>
                ) : (
                  invitations.map(inv => (
                    <Dropdown.Item
                      key={inv.id}
                      onClick={() => onInvitationClick(inv)}
                    >
                      <strong>{inv.group.name}</strong><br />
                      <small className="text-muted">
                        da {inv.from.username}
                      </small>
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>

            {/* LOGOUT */}
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Nav>
        )}
      </Container>
    </Navbar>
  );
}