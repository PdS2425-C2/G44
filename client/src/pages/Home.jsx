import React, { useState } from 'react';
import { Container, Row, Col, Button, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/GroupsProvider';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import GroupsList from '../components/groups/GroupsList';
import MessageAlert from '../components/feedback/MessageAlert';
import CreatePrivateChatModal from '../components/groups/CreatePrivateChatModal';
import ChatRoom from '../components/groups/ChatRoom'; 

const Home = () => {
    const { user } = useAuth();
    const { groups, loadingGroups, groupsError, addGroup } = useGroups();
    
    const [showModal, setShowModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatType, setChatType] = useState('private');
    const [searchQuery, setSearchQuery] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);

    const filteredGroups = groups.filter(g => {
        const matchesType = chatType === 'group' ? g.is_group === true : g.is_group === false;
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <Container fluid className="h-100 p-0 overflow-hidden bg-white">
            <Row className="m-0 h-100">
                
                {/* --- COLONNA SINISTRA: Lista Chat --- */}
                <Col md={5} lg={4} xl={3} className="p-0 d-flex flex-column border-end h-100 bg-white">
                    <div className="p-3 pb-2 border-bottom">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0 fw-bold">Messaggi</h4>
                            
                            <Button 
                                variant="link" 
                                className="p-0 border-0 text-dark d-flex align-items-center justify-content-center" 
                                onClick={() => setShowChatModal(true)} 
                                title="Nuova Chat"
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                style={{
                                    transition: 'all 0.2s ease-in-out',
                                    transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                    opacity: isHovered ? 0.7 : 1
                                }}
                            >
                                <i className="bi bi-plus-circle-fill fs-3"></i>
                            </Button>
                        </div>

                        <Form.Control 
                            type="text" 
                            placeholder="Cerca chat per nome" 
                            className="mb-3 bg-light border-0"
                            style={{ borderRadius: '8px' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <div className="d-flex bg-light p-1" style={{ borderRadius: '8px' }}>
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

                    <div className="flex-grow-1 overflow-auto p-0">
                        {groupsError && (
                            <div className="p-3">
                                <MessageAlert variant="danger" message={groupsError} />
                            </div>
                        )}
                        
                        {loadingGroups && (
                            <div className="text-center mt-4">
                                <Spinner animation="border" variant="primary" />
                            </div>
                        )}

                        {!loadingGroups && filteredGroups.length === 0 && (
                            <div className="text-center mt-5 text-muted px-3">
                                {searchQuery 
                                    ? "Nessun risultato per la tua ricerca." 
                                    : (chatType === 'private' ? "Nessuna chat privata trovata." : "Nessun gruppo trovato.")
                                }
                            </div>
                        )}

                        {!loadingGroups && filteredGroups.length > 0 && (
                            <GroupsList 
                                groups={filteredGroups} 
                                onSelectGroup={(chat) => setSelectedChat(chat)} 
                            />
                        )}
                    </div>
                </Col>

                {/* --- COLONNA DESTRA: Chat Room o Placeholder --- */}
                <Col md={7} lg={8} xl={9} className="p-0 d-none d-md-flex h-100 bg-light align-items-center justify-content-center">
                    {/* 4. RENDER CONDIZIONALE */}
                    {selectedChat ? (
                        <ChatRoom chat={selectedChat} />
                    ) : (
                        <div className="text-center text-muted">
                            <h5>Benvenuto, {user?.name}! 👋</h5>
                            <p>Seleziona una chat dalla barra laterale per iniziare.</p>
                        </div>
                    )}
                </Col>
                
            </Row>

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
                onOpenGroupModal={() => {
                    setShowChatModal(false); 
                    setShowModal(true);      
                }}
            />
        </Container>
    );
};

export default Home;