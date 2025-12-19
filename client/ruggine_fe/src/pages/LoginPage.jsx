import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { logIn } = useAuth();

  const handleLogin = (credentials) => logIn(credentials);

  return <LoginForm onLogin={handleLogin} />;
};

export default LoginPage;
