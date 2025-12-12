import { useEffect, useState } from "react";
import { Container, Card, Row, Col } from "react-bootstrap";
import API from "../API/API.mjs";

function Home({ user }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    API.getGroups()
      .then(setGroups)
      .catch(err => setError(err));
  }, []);

  return (
    <Container className="mt-5">

      <h2 className="mb-4">Benvenuto {user?.name}</h2>

      {error && <p className="text-danger">{error}</p>}

      <h4>I tuoi gruppi</h4>

      {groups.length === 0 ? (
        <p className="text-muted mt-3">Non appartieni a nessun gruppo.</p>
      ) : (
        <Row className="mt-3">
          {groups.map(g => (
            <Col md={4} key={g.id}>
              <Card className="mb-3 shadow-sm">
                <Card.Body>
                  <Card.Title>{g.name}</Card.Title>
                  <Card.Text>
                    Creato il: {new Date(g.created_at).toLocaleString()}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Home;