import { useState } from "react";
import {
  Modal,
  Button,
  Form,
  Alert
} from "react-bootstrap";
import API from "../API/API.mjs";
import UserSelect from "./UserSelect";

function CreateGroup({ show, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [invitees, setInvitees] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Il nome del gruppo è obbligatorio");
      return;
    }

    setLoading(true);

    try {
      const usernames = invitees.map(u => u.username);
      const group = await API.createGroup(name, usernames);

      onCreated(group);
      onClose();

      // reset
      setName("");
      setInvitees([]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Crea nuovo gruppo</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Nome gruppo</Form.Label>
            <Form.Control
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Es. Rust Enjoyers"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <UserSelect
              value={invitees}
              onChange={setInvitees}
            />
          </Form.Group>

        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? "Creazione..." : "Crea gruppo"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default CreateGroup;