import { useEffect, useState } from "react";
import {
  Form,
  ListGroup,
  Badge,
  Spinner
} from "react-bootstrap";
import API from "../API/API.mjs";

function UserMultiSelect({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await API.searchUsers(query);
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [query]);

  const addUser = (u) => {
    if (value.find(v => v.username === u.username)) return;
    onChange([...value, u]);
    setQuery("");
    setResults([]);
  };

  const removeUser = (username) => {
    onChange(value.filter(u => u.username !== username));
  };

  return (
    <Form.Group>
      <Form.Label>Invita utenti</Form.Label>

      {/* utenti selezionati */}
      <div className="mb-2">
        {value.map(u => (
          <Badge
            key={u.username}
            bg="primary"
            className="me-2 mb-1"
            style={{ cursor: "pointer" }}
            onClick={() => removeUser(u.username)}
          >
            {u.username} ✕
          </Badge>
        ))}
      </div>

      {/* input */}
      <Form.Control
        value={query}
        placeholder="Cerca per username"
        onChange={e => setQuery(e.target.value)}
      />

      {/* dropdown */}
      {query && (
        <ListGroup className="position-absolute w-100 shadow z-3">
          {loading && (
            <ListGroup.Item>
              <Spinner size="sm" /> ricerca...
            </ListGroup.Item>
          )}

          {!loading && results.map(u => (
            <ListGroup.Item
              key={u.id}
              action
              onClick={() => addUser(u)}
            >
              <strong>{u.username}</strong>
              <div className="text-muted small">{u.name}</div>
            </ListGroup.Item>
          ))}

          {!loading && results.length === 0 && (
            <ListGroup.Item className="text-muted">
              Nessun risultato
            </ListGroup.Item>
          )}
        </ListGroup>
      )}
    </Form.Group>
  );
}

export default UserMultiSelect;