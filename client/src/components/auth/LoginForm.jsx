import { useState } from 'react';
import {
  Form,
  Button,
  Card,
  Container,
  Alert,
  FloatingLabel,
  Spinner
} from 'react-bootstrap';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin({ username, password });
      if (!result?.ok) {
        setError('Username o password non corretti, riprovare!');
      }
    } catch {
      setError('Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="d-flex flex-column align-items-center justify-content-center">
        
        <div className="text-center mb-4">
          <h1 className="fw-bold mb-1" style={{ color: '#e65a41', fontSize: '3rem' }}>
            🦀 Ruggine
          </h1>
          <p className="text-muted fs-5">Accedi per continuare</p>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4 p-sm-5">
              
              {error && (
                <Alert variant="danger" className="text-center rounded-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                
                <FloatingLabel
                  controlId="loginUsername"
                  label="Username"
                  className="mb-3 text-muted"
                >
                  <Form.Control
                    type="text"
                    placeholder="Inserisci username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-light border-0 shadow-none rounded-3"
                    style={{ paddingTop: '1.625rem', paddingBottom: '0.625rem' }}
                  />
                </FloatingLabel>

                <FloatingLabel
                  controlId="loginPassword"
                  label="Password"
                  className="mb-4 text-muted"
                >
                  <Form.Control
                    type="password"
                    placeholder="Inserisci password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-light border-0 shadow-none rounded-3"
                    style={{ paddingTop: '1.625rem', paddingBottom: '0.625rem' }}
                  />
                </FloatingLabel>

                <Button 
                  type="submit" 
                  className="w-100 rounded-pill py-2 fw-semibold fs-5 border-0 text-white" 
                  disabled={loading}
                  style={{ transition: 'all 0.2s', backgroundColor: '#e65a41' }}
                >
                  {loading ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                        className="me-2" 
                      />
                      Accesso...
                    </>
                  ) : (
                        'Entra'
                  )}
                </Button>

              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default LoginForm;