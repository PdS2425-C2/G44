import { Card } from 'react-bootstrap';

const GroupsList = ({ groups }) => (
  <div className="mt-3">
    {groups.map((g) => (
      <Card key={g.id} className="mb-2">
        <Card.Body className="d-flex align-items-center">

          <div className="me-3 fs-1">
            <i className={`bi ${g.is_group ? 'bi-people' : 'bi-person'}`}></i>
          </div>

          <div>
            <Card.Title>
              {g.name}
            </Card.Title>

            <Card.Subtitle className="text-muted">
              Creato il {new Date(g.created_at).toLocaleString()}
            </Card.Subtitle>
          </div>

        </Card.Body>
      </Card>
    ))}
  </div>
);

export default GroupsList;
