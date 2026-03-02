import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import App from './app/App';
import { AuthProvider } from './hooks/useAuth';
import { GroupsProvider } from './hooks/GroupsProvider';
import { NotificationsProvider } from './hooks/NotificationsProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <GroupsProvider>
            <App />
          </GroupsProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter >
  </StrictMode >
);
