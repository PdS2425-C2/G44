import { Card } from 'react-bootstrap';

const GroupsList = ({ groups }) => (
  <div className="mt-3">
    {groups.map((g) => (
      <Card key={g.id} className="mb-2">
        <Card.Body>
          <Card.Title>{g.name}</Card.Title>
          <Card.Subtitle className="text-muted">
            Creato il {new Date(g.created_at).toLocaleString()}
          </Card.Subtitle>
        </Card.Body>
      </Card>
    ))}
  </div>
);

export default GroupsList;
