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

const LoginForm = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const resetFormState = () => {
    setUsername('');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    resetFormState();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (!name.trim()) {
        setError('Il nome è obbligatorio');
        return;
      }

      if (password.length < 6) {
        setError('La password deve contenere almeno 6 caratteri');
        return;
      }

      if (password !== confirmPassword) {
        setError('Le password non coincidono');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await onLogin({
          username: username.trim(),
          password,
        });
      } else {
        await onRegister({
          name: name.trim(),
          username: username.trim(),
          password,
        });
      }
    } catch (err) {
      setError(err.message || (isLogin
        ? 'Errore durante il login'
        : 'Errore durante la registrazione'));
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
          <p className="text-muted fs-5">
            {isLogin ? 'Accedi per continuare' : 'Crea un nuovo account'}
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-4 p-sm-5">
              <div className="d-flex bg-light p-1 mb-4" style={{ borderRadius: '10px' }}>
                <Button
                  type="button"
                  variant="none"
                  className={`w-50 border-0 ${isLogin ? 'bg-white shadow-sm fw-medium' : 'text-muted'}`}
                  style={{ borderRadius: '8px' }}
                  onClick={() => {
                    if (!isLogin) switchMode();
                  }}
                  disabled={loading}
                >
                  Login
                </Button>

                <Button
                  type="button"
                  variant="none"
                  className={`w-50 border-0 ${!isLogin ? 'bg-white shadow-sm fw-medium' : 'text-muted'}`}
                  style={{ borderRadius: '8px' }}
                  onClick={() => {
                    if (isLogin) switchMode();
                  }}
                  disabled={loading}
                >
                  Registrati
                </Button>
              </div>

              {error && (
                <Alert variant="danger" className="text-center rounded-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {!isLogin && (
                  <FloatingLabel
                    controlId="registerName"
                    label="Nome"
                    className="mb-3 text-muted"
                  >
                    <Form.Control
                      type="text"
                      placeholder="Inserisci nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="bg-light border-0 shadow-none rounded-3"
                      style={{ paddingTop: '1.625rem', paddingBottom: '0.625rem' }}
                    />
                  </FloatingLabel>
                )}

                <FloatingLabel
                  controlId="authUsername"
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
                  controlId="authPassword"
                  label="Password"
                  className="mb-3 text-muted"
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

                {!isLogin && (
                  <FloatingLabel
                    controlId="registerConfirmPassword"
                    label="Conferma password"
                    className="mb-4 text-muted"
                  >
                    <Form.Control
                      type="password"
                      placeholder="Conferma password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                      className="bg-light border-0 shadow-none rounded-3"
                      style={{ paddingTop: '1.625rem', paddingBottom: '0.625rem' }}
                    />
                  </FloatingLabel>
                )}

                {isLogin && <div className="mb-4" />}

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
                      {isLogin ? 'Accesso...' : 'Registrazione...'}
                    </>
                  ) : (
                    isLogin ? 'Entra' : 'Crea account'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="link"
                  className="text-decoration-none p-0"
                  style={{ color: '#e65a41' }}
                  onClick={switchMode}
                  disabled={loading}
                >
                  {isLogin
                    ? 'Non hai un account? Registrati'
                    : 'Hai già un account? Accedi'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default LoginForm;