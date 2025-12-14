import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Spinner
} from "react-bootstrap";
import API from "../API/API.mjs";
import CreateGroupModal from "./CreateGroup";

function Home({ user }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    API.getGroups()
      .then(gs => {
        setGroups(gs);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  const handleGroupCreated = (group) => {
    setGroups(gs => [group, ...gs]);
  };

  return (
    <Container className="mt-4">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Ciao, {user?.name} 👋</h2>
          <p className="text-muted mb-0">
            Qui trovi i tuoi gruppi di chat
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowModal(true)}
        >
          + Crea gruppo
        </Button>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading && (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="text-center p-4 text-muted">
          <Card.Body>
            <Card.Title>Nessun gruppo</Card.Title>
            <Card.Text>
              Crea un nuovo gruppo o accetta un invito.
            </Card.Text>
          </Card.Body>
        </Card>
      )}

      <Row className="mt-3">
        {groups.map(g => (
          <Col md={4} key={g.id}>
            <Card className="mb-3 shadow-sm h-100" role="button">
              <Card.Body>
                <Card.Title>{g.name}</Card.Title>
                <Card.Text className="text-muted small">
                  Creato il {new Date(g.created_at).toLocaleString()}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <CreateGroupModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleGroupCreated}
      />
    </Container>
  );
}

export default Home;