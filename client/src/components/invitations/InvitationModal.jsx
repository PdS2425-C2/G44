import { useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

const InvitationModal = ({ show, invitation, onAccept, onReject, onHide }) => {
  const [loading, setLoading] = useState(false);

  if (!invitation) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(invitation);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(invitation);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Body className="text-center py-5 px-4">
        <div
          className="d-inline-flex justify-content-center align-items-center rounded-circle mb-4"
          style={{ width: '80px', height: '80px', backgroundColor: '#fbece9', color: '#e65a41' }}
        >
          <i className="bi bi-envelope-paper-heart fs-1"></i>
        </div>

        <h4 className="fw-bold mb-3">Nuovo invito!</h4>

        <p className="text-muted fs-5 mb-0">
          <strong className="text-dark">{invitation.from.username}</strong> ti ha invitato nel gruppo{' '}
          <strong className="text-dark">{invitation.chat.name}</strong>.
        </p>
      </Modal.Body>

      <Modal.Footer className="border-0 justify-content-center pb-4 pt-0 gap-2">
        <Button
          variant="light"
          onClick={handleReject}
          disabled={loading}
          className="rounded-pill px-4 fw-semibold border"
        >
          Rifiuta
        </Button>
        <Button
          onClick={handleAccept}
          disabled={loading}
          className="rounded-pill px-4 fw-semibold text-white border-0"
          style={{ backgroundColor: '#e65a41' }}
        >
          {loading ? <Spinner size="sm" /> : 'Accetta invito'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InvitationModal;