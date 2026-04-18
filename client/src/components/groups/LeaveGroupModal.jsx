import { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import API from '../../api/client';

const LeaveGroupModal = ({ show, chat, onHide, onLeft }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    setError('');
    setLoading(true);
    try {
      await API.leaveChat(chat.id);
      onLeft?.(chat.id);
    } catch (err) {
      setError(err.message || 'Impossibile uscire dal gruppo. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleHide = () => {
    if (loading) return;
    setError('');
    onHide?.();
  };

  if (!chat) return null;

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Body className="text-center py-5 px-4">
        <div
          className="d-inline-flex justify-content-center align-items-center rounded-circle mb-4"
          style={{ width: '80px', height: '80px', backgroundColor: '#f8d7da', color: '#dc3545' }}
        >
          <i className="bi bi-door-open fs-1"></i>
        </div>

        <h4 className="fw-bold mb-3">Vuoi uscire dal gruppo?</h4>

        {error && <Alert variant="danger" className="text-center rounded-3">{error}</Alert>}

        <p className="text-muted fs-5 mb-0">
          Stai per abbandonare <strong className="text-dark">{chat.name}</strong>. Non potrai più vedere i messaggi del gruppo.
        </p>
      </Modal.Body>

      <Modal.Footer className="border-0 justify-content-center pb-4 pt-0 gap-2">
        <Button
          variant="light"
          onClick={handleHide}
          disabled={loading}
          className="rounded-pill px-4 fw-semibold border"
        >
          Annulla
        </Button>
        <Button
          variant="danger"
          onClick={handleLeave}
          disabled={loading}
          className="rounded-pill px-4 fw-semibold border-0"
        >
          {loading ? <><Spinner size="sm" className="me-2" />Uscita...</> : 'Sì, esci'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveGroupModal;