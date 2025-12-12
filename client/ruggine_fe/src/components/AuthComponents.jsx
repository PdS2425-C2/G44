// src/components/AuthComponents.jsx
import { useActionState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { Link } from 'react-router';

function LoginForm({ handleLogin }) {
  const [state, formAction, isPending] = useActionState(login, {});
  
  async function login(_, fd) {
    await handleLogin({ username: fd.get('username'), password: fd.get('password') }); return { ok: true };
  }

  return (
    <section className="vh-100 d-flex align-items-center justify-content-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6} xl={5}>
            <Card bg="dark" text="white" className="shadow" style={{ borderRadius: '1rem' }}>
              <Card.Body className="p-5 text-center">
                <h2 className="fw-bold text-uppercase mb-2">Login</h2>

                <Form action={formAction}>
                  <Form.Group controlId="username" className="form-white mb-4">
                    <Form.Control placeholder='Email or Username' name="username" size="lg" required />
                  </Form.Group>

                  <Form.Group controlId="password" className="form-white mb-4">
                    <Form.Control type="password" placeholder='password' name="password" size="lg" required minLength={6} />
                  </Form.Group>

                 

                  <Button variant="outline-light" size="lg" type="submit" className="px-5" disabled={isPending}>Login</Button>
                </Form>

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

const LogoutButton = ({ logout }) => <Button variant="outline-light" onClick={logout}>Logout</Button>;

export { LoginForm, LogoutButton };
