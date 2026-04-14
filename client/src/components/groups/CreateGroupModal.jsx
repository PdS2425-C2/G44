import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import API from '../../api/client';
import UserSelect from '../users/UserSelect';

const CreateGroupModal = ({ show, onHide, onCreated }) => {
  const [name, setName] = useState('');
  const [invitees, setInvitees] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Il nome del gruppo è obbligatorio');
      return;
    }

    setLoading(true);
    try {
      const group = await API.createGroup(name);
      const usernames = invitees.map((u) => u.username);

      for (const username of usernames) {
        await API.createRequest(group.id, username);
      }

      onCreated?.(group);
      onHide?.();

      // reset
      setName('');
      setInvitees([]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Errore durante la creazione del gruppo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Crea nuovo gruppo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="groupName">
            <Form.Label>Nome gruppo</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Rust Enjoyers"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="groupInvitees">
            <Form.Label>Invita utenti</Form.Label>
            <UserSelect value={invitees} onChange={setInvitees} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Annulla
          </Button>
          <Button 
            type="submit" 
            className="text-white border-0" 
            style={{ backgroundColor: '#e65a41' }} 
            disabled={loading}
          >
            {loading ? 'Creazione...' : 'Crea gruppo'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateGroupModal;