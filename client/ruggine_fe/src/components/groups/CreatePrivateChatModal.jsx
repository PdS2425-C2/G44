import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import API from '../../api/client';
import UserSelect from '../users/UserSelect';

// Aggiunta la prop onOpenGroupModal
const CreatePrivateChatModal = ({ show, onHide, onCreated, onOpenGroupModal }) => {
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

  // Funzione per gestire il click su "Nuovo gruppo"
  const handleOpenGroupClick = () => {
    reset(); // Puliamo lo stato prima di cambiare modale
    onOpenGroupModal?.();
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
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Nuova chat</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* --- NUOVO BOTTONE: Crea Gruppo --- */}
          <div className="mb-4">
            <Button
              variant="light"
              className="w-100 d-flex align-items-center p-2 border-0 shadow-sm"
              onClick={handleOpenGroupClick}
              style={{ transition: 'background-color 0.2s' }}
            >
              <div
                className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="bi bi-people-fill fs-5"></i>
              </div>
              <span className="fw-semibold text-dark">Nuovo gruppo</span>
            </Button>
          </div>

          {/* Separatore visivo */}
          <div className="text-muted small mb-2 text-uppercase fw-bold px-1">
             Contatti
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-2">
            <UserSelect value={selected} onChange={setSelected} />
          </Form.Group>

        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={handleClose} disabled={loading} className="rounded-pill px-4">
            Annulla
          </Button>

          <Button type="submit" variant="primary" disabled={loading} className="rounded-pill px-4">
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