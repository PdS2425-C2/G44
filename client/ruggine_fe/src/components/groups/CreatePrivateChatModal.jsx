import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import API from '../../api/client';
import UserSelect from '../users/UserSelect';

const CreatePrivateChatModal = ({ show, onHide, onCreated }) => {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setSelected([]);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onHide?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (selected.length !== 1) {
      setError('Seleziona esattamente 1 utente');
      return;
    }

    const username = selected[0]?.username;
    if (!username) {
      setError('Utente non valido');
      return;
    }

    setLoading(true);
    try {
      const chat = await API.createPrivateChat(username);

      onCreated?.(chat);
      reset();
    } catch (err) {
      setError(err.message || 'Errore durante la creazione della chat privata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Form onSubmit={handleCreate}>
        <Modal.Header closeButton>
          <Modal.Title>Crea chat privata</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-2">
            <Form.Label>Seleziona utente</Form.Label>
            <UserSelect value={selected} onChange={setSelected} />
          </Form.Group>

        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Annulla
          </Button>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creazione...
              </>
            ) : (
              'Crea chat'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreatePrivateChatModal;