import { useEffect, useState } from "react";
import {
  Form,
  ListGroup,
  Badge,
  Spinner
} from "react-bootstrap";
import API from '../../api/client';

// Aggiungiamo onSelect come prop opzionale, e diamo un default a value = [] per evitare errori
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

  // --- NUOVA LOGICA: Decidiamo cosa fare al click ---
  const handleUserClick = (u) => {
    if (onSelect) {
      // Se abbiamo passato onSelect, inneschiamo l'azione immediata!
      onSelect(u);
    } else {
      // Altrimenti, ci comportiamo come prima (aggiungendo l'utente alla lista per i gruppi)
      addUser(u);
    }
  };

  return (
    // Ho aggiunto position-relative per evitare che il menu a tendina "voli" fuori posizione
    <Form.Group className="position-relative">
      
      {/* utenti selezionati (i badge). Li nascondiamo se stiamo usando la modalità "onSelect" immediata */}
      {!onSelect && value.length > 0 && (
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
      )}

      {/* input */}
      <Form.Control
        value={query}
        placeholder="Cerca per username o per nome"
        onChange={e => setQuery(e.target.value)}
      />

      {/* dropdown */}
      {query && (
        <ListGroup className="position-absolute w-100 shadow z-3 mt-1">
          {loading && (
            <ListGroup.Item>
              <Spinner size="sm" className="me-2" /> ricerca...
            </ListGroup.Item>
          )}

          {/* Sostituito addUser(u) con la nostra nuova funzione handleUserClick(u) */}
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