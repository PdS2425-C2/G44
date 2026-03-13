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

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Esci dal gruppo</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <p className="mb-0">
          Sei sicuro di voler uscire da <strong>{chat?.name}</strong>?
          Non potrai più vedere i messaggi del gruppo.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleHide} disabled={loading}>
          Annulla
        </Button>
        <Button variant="danger" onClick={handleLeave} disabled={loading}>
          {loading ? <><Spinner size="sm" className="me-2" />Uscita...</> : 'Esci dal gruppo'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveGroupModal;