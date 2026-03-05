import React, { useState } from 'react';
import { Container, Row, Col, Button, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/GroupsProvider';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import GroupsList from '../components/groups/GroupsList';
import MessageAlert from '../components/feedback/MessageAlert';
import CreatePrivateChatModal from '../components/groups/CreatePrivateChatModal';

const Home = () => {
    const { user } = useAuth();
    const { groups, loadingGroups, groupsError, addGroup } = useGroups();
    
    // Stati per le modali
    const [showModal, setShowModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    
    // Nuovo stato per gestire il toggle Private / Gruppi (di default su 'private')
    const [chatType, setChatType] = useState('private');

    return (
        // Utilizziamo fluid, h-100 per coprire tutta l'altezza e p-0 per rimuovere il padding
        <Container fluid className="h-100 p-0 overflow-hidden bg-white">
            <Row className="h-100 g-0">
                
                {/* --- COLONNA SINISTRA: Lista Chat --- */}
                <Col md={5} lg={3} className="d-flex flex-column border-end h-100">
                    
                    {/* Header della colonna (Fisso in alto) */}
                    <div className="p-3 pb-2">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0 fw-bold">Messaggi</h4>
                            {/* Piccolo menu a tendina o icone per creare chat (sostituiscono i tuoi vecchi bottoni grandi) */}
                            <div className="d-flex gap-2">
                                <Button variant="light" size="sm" className="rounded-circle" onClick={() => setShowChatModal(true)} title="Nuova Chat Privata">
                                    👤+
                                </Button>
                                <Button variant="light" size="sm" className="rounded-circle" onClick={() => setShowModal(true)} title="Nuovo Gruppo">
                                    👥+
                                </Button>
                            </div>
                        </div>

                        {/* Barra di ricerca */}
                        <Form.Control 
                            type="text" 
                            placeholder="Cerca chat..." 
                            className="mb-3 bg-light border-0"
                            style={{ borderRadius: '8px' }}
                        />

                        {/* Toggle Switch (Private / Gruppi) simile a quello nell'immagine */}
                        <div className="d-flex bg-light p-1 mb-2" style={{ borderRadius: '8px' }}>
                            <Button
                                variant="none"
                                className={`w-50 border-0 ${chatType === 'private' ? 'bg-white shadow-sm fw-medium' : 'text-muted'}`}
                                style={{ borderRadius: '6px' }}
                                onClick={() => setChatType('private')}
                            >
                                Private
                            </Button>
                            <Button
                                variant="none"
                                className={`w-50 border-0 ${chatType === 'group' ? 'bg-white shadow-sm fw-medium' : 'text-muted'}`}
                                style={{ borderRadius: '6px' }}
                                onClick={() => setChatType('group')}
                            >
                                Gruppi
                            </Button>
                        </div>
                    </div>

                    {/* Area scrollabile della lista chat */}
                    <div className="flex-grow-1 overflow-auto px-2 mb-3">
                        {groupsError && <MessageAlert variant="danger" message={groupsError} />}
                        
                        {loadingGroups && (
                            <div className="text-center mt-4">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        )}

                        {!loadingGroups && groups.length === 0 && (
                            <div className="text-center mt-5 text-muted">
                                <p>Nessuna conversazione trovata.</p>
                            </div>
                        )}

                        {/* Qui applicheremo poi un filtro per passare al componente solo private o gruppi in base allo stato `chatType` */}
                        {!loadingGroups && groups.length > 0 && (
                            <GroupsList groups={groups} />
                        )}
                    </div>
                </Col>

                {/* --- COLONNA DESTRA: Placeholder Chat Aperta --- */}
                <Col md={7} lg={9} className="d-none d-md-flex h-100 bg-light align-items-center justify-content-center">
                    <div className="text-center text-muted">
                        <h5>Benvenuto, {user?.name}! 👋</h5>
                        <p>Seleziona una chat dalla barra laterale per iniziare.</p>
                    </div>
                </Col>
                
            </Row>

            {/* Modali (invariate) */}
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