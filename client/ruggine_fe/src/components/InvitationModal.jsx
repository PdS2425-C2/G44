import { Modal, Button } from "react-bootstrap";

export default function InvitationModal({
  invite,
  onAccept,
  onReject,
  onClose
}) {
  if (!invite) return null;

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Invito a gruppo</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>
          <strong>{invite.from.username}</strong> ti ha invitato
          nel gruppo <strong>{invite.group.name}</strong>
        </p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onReject}>
          Rifiuta
        </Button>
        <Button variant="success" onClick={onAccept}>
          Accetta
        </Button>
      </Modal.Footer>
    </Modal>
  );
}