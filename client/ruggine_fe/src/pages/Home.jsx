import React, { useState } from 'react';
import { Container, Card, Row, Col, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/GroupsProvider';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import GroupsList from '../components/groups/GroupsList';
import MessageAlert from '../components/feedback/MessageAlert';
import CreatePrivateChatModal from '../components/groups/CreatePrivateChatModal';

const Home = () => {
    const { user } = useAuth();
    // const user = {};
    const { groups, loadingGroups, groupsError, addGroup } = useGroups();
    const [showModal, setShowModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    return (
        <Container className="mt-4">
            <h2>Ciao, {user?.name} 👋</h2>
            <p>Qui trovi i tuoi gruppi di chat</p>

            <Button variant="primary" onClick={() => setShowModal(true)}>
                + Crea gruppo
            </Button>

            <Button variant="outline-primary" onClick={() => setShowChatModal(true)}>
                + Crea Chat
            </Button>

            {groupsError && (
                <MessageAlert variant="danger" message={groupsError} />
            )}

            {loadingGroups && (
                <div className="mt-3">
                    <Spinner animation="border" />
                </div>
            )}

            {!loadingGroups && groups.length === 0 && (
                <Card className="mt-3">
                    <Card.Body>
                        <Card.Title>Nessun gruppo</Card.Title>
                        <Card.Text>Crea un nuovo gruppo o accetta un invito.</Card.Text>
                    </Card.Body>
                </Card>
            )}

            {!loadingGroups && groups.length > 0 && (
                <GroupsList groups={groups} />
            )}

            <CreateGroupModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onCreated={(group) => {
                    addGroup(group);
                    setShowModal(false);
                }}
            />
            <CreatePrivateChatModal
                show={showChatModal}
                onHide={() => setShowChatModal(false)}
                onCreated={(chat) => {
                    addGroup(chat);       
                    setShowChatModal(false);
                }}
                />
        </Container>
    );
};

export default Home;
