import { Modal, Button } from 'react-bootstrap';

const InvitationModal = ({ show, invitation, onAccept, onReject, onHide }) => {
  if (!invitation) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Invito a gruppo</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>{invitation.from.username}</strong> ti ha invitato nel gruppo{' '}
          <strong>{invitation.group.name}</strong>.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onReject}>
          Rifiuta
        </Button>
        <Button variant="primary" onClick={onAccept}>
          Accetta
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InvitationModal;
