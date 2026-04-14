import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { logIn } = useAuth();

  const handleLogin = (credentials) => logIn(credentials);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <LoginForm onLogin={handleLogin} />
    </div>
  );
};

export default LoginPage;