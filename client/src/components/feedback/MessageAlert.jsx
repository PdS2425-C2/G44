import { Alert } from 'react-bootstrap';

const MessageAlert = ({ message, variant = 'info', onClose }) => {
  if (!message) return null;
  return (
    <Alert variant={variant} dismissible={!!onClose} onClose={onClose}>
      {message}
    </Alert>
  );
};

export default MessageAlert;
