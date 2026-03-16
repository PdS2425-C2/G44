import { useEffect, useState } from "react";
import {
  Form,
  ListGroup,
  Spinner
} from "react-bootstrap";
import API from '../../api/client';

const UserSelect = ({ value = [], onChange, onSelect }) => {
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
    }, 300);

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

  const handleUserClick = (u) => {
    if (onSelect) {
      onSelect(u);
    } else {
      addUser(u);
    }
  };

  return (
    <Form.Group className="position-relative">
      
      {!onSelect && value.length > 0 && (
        <div className="mb-2">
          {value.map(u => (
            <span
              key={u.username}
              className="badge me-2 mb-1"
              style={{ cursor: "pointer", backgroundColor: "#e65a41", color: "white" }}
              onClick={() => removeUser(u.username)}
            >
              {u.username} ✕
            </span>
          ))}
        </div>
      )}

      <Form.Control
        value={query}
        placeholder="Cerca per username o per nome"
        onChange={e => setQuery(e.target.value)}
      />

      {query && (
        <ListGroup className="position-absolute w-100 shadow z-3 mt-1">
          {loading && (
            <ListGroup.Item>
              <Spinner size="sm" className="me-2" /> ricerca...
            </ListGroup.Item>
          )}

          {!loading && results.map(u => (
            <ListGroup.Item
              key={u.id}
              action
              onClick={() => handleUserClick(u)}
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
};

export default UserSelect;