import { Routes, Route, Navigate } from 'react-router-dom';

import DefaultLayout from '../components/layout/DefaultLayout';
import Home from '../pages/Home';
import LoginPage from '../pages/LoginPage';
import InvitationModal from '../components/invitations/InvitationModal';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/NotificationsProvider';
import { useGroups } from '../hooks/GroupsProvider';
import API from '../api/client';

const AppRoutes = () => {
  const { loggedIn } = useAuth();
  const {
    invitations,
    selectedInvite,
    setSelectedInvite,
    removeInvitation,
  } = useNotifications();
  const { addGroup } = useGroups();

  const handleAcceptInvite = async () => {
    if (!selectedInvite) return;
    const newGroup = await API.patchRequest(selectedInvite.id, 'accept');
    addGroup(newGroup);
    removeInvitation(selectedInvite.id);
    setSelectedInvite(null);
  };

  const handleRejectInvite = async () => {
    if (!selectedInvite) return;
    await API.patchRequest(selectedInvite.id, 'reject');
    removeInvitation(selectedInvite.id);
    setSelectedInvite(null);
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            loggedIn ? (
              <DefaultLayout invitations={invitations} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Home />} />
        </Route>

        <Route
          path="/login"
          element={
            loggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <DefaultLayout hideNav>
                <LoginPage />
              </DefaultLayout>
            )
          }
        />
      </Routes>

      <InvitationModal
        show={!!selectedInvite}
        invitation={selectedInvite}
        onAccept={handleAcceptInvite}
        onReject={handleRejectInvite}
        onHide={() => setSelectedInvite(null)}
      />
    </>
  );
};

export default AppRoutes;
