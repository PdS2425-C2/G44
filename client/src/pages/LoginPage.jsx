import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { logIn, register } = useAuth();

  const handleLogin = (credentials) => logIn(credentials);
  const handleRegister = (userData) => register(userData);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  );
};

export default LoginPage;