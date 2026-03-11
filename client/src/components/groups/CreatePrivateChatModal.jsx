import { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import API from '../../api/client';
import UserSelect from '../users/UserSelect';

const CreatePrivateChatModal = ({ show, onHide, onCreated, onOpenGroupModal }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onHide?.();
  };

  const handleOpenGroupClick = () => {
    reset();
    onOpenGroupModal?.();
  };

  // --- NUOVA LOGICA: Creazione immediata ricevendo l'utente direttamente da UserSelect ---
  const handleCreateImmediate = async (selectedUser) => {
    setError('');
    setLoading(true);

    try {
      const chat = await API.createPrivateChat(selectedUser.username);
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
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Nuova chat</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="mb-4">
          <Button
            variant="light"
            className="w-100 d-flex align-items-center p-2 border-0 shadow-sm"
            onClick={handleOpenGroupClick}
            disabled={loading}
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

        <div className="text-muted small mb-2 text-uppercase fw-bold px-1">
          Contatti
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center my-4 text-muted">
            <Spinner animation="border" variant="primary" className="mb-2" />
            <p>Creazione chat in corso...</p>
          </div>
        ) : (
          /* --- MODIFICA QUI: Passiamo onSelect invece di value/onChange --- */
          <UserSelect onSelect={handleCreateImmediate} />
        )}
      </Modal.Body>

      {/* Rimosso il bottone "Crea Chat" blu, lasciamo solo Annulla */}
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={handleClose} disabled={loading} className="rounded-pill px-4">
          Annulla
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePrivateChatModal;