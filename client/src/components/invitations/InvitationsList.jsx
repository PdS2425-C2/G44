import { ListGroup, Button, Badge } from 'react-bootstrap';

const InvitationsList = ({ invitations, onSelect }) => {
  if (!invitations || invitations.length === 0) {
    return <span>Nessun invito</span>;
  }

  return (
    <ListGroup variant="flush">
      {invitations.map((inv) => (
        <ListGroup.Item key={inv.id} className="d-flex justify-content-between align-items-center">
          <div>
            <div>
              <strong>{inv.group.name}</strong>{' '}
              <Badge bg="secondary">@{inv.from.username}</Badge>
            </div>
            <small className="text-muted">
              inviato il {new Date(inv.sent_at).toLocaleString()}
            </small>
          </div>
          <Button size="sm" variant="outline-primary" onClick={() => onSelect(inv)}>
            Dettagli
          </Button>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default InvitationsList;
