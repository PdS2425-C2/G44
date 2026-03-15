import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/NotificationsProvider';
import API from '../../api/client';
import { useGroups } from '../../hooks/GroupsProvider';

const formatSeparatorDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ieri';
    } else {
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    }
};

const ChatRoom = ({ chat }) => {
    const { user } = useAuth();
    const { incomingMessage, newMemberEvent } = useNotifications();
    const { updateGroupActivity, resetUnreadCount } = useGroups();
    
    const [messages, setMessages] = useState([]);
    const [participants, setParticipants] = useState([]); 
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        if (!chat?.id) return;
        
        setLoading(true);
        setError('');
        
        try {
            const [messagesData, participantsData] = await Promise.all([
                API.getMessages(chat.id),
                API.getParticipants(chat.id)
            ]);
            
            setMessages(messagesData || []);
            setParticipants(participantsData || []);
        } catch (err) {
            console.error(err);
            setError('Impossibile caricare i dati della chat.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        const tempMessage = {
            id: `temp-${Date.now()}`,
            from: { id: user?.id, name: user?.name, username: user?.username },
            chat_id: chat.id,
            content: messageText,
            sent_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, tempMessage]);
        
        updateGroupActivity(chat.id, tempMessage, true);

        try {
            await API.sendMessage(chat.id, messageText);
        } catch (err) {
            console.error("Errore nell'invio:", err);
            setError('Impossibile inviare il messaggio. Riprova.');
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        scrollToBottom();

        if (chat?.id) {
            resetUnreadCount(chat.id);
            API.markAsRead(chat.id).catch(() => {});
        }
    }, [messages.length, chat?.id, resetUnreadCount]);

    useEffect(() => {
        fetchMessages();
    }, [chat?.id]);

    useEffect(() => {
        if (!incomingMessage || incomingMessage.chat_id !== chat?.id) return;

        setMessages((prev) => {
            const alreadyExists = prev.some((m) => m.id === incomingMessage.id);
            if (alreadyExists) return prev;
            return [...prev, incomingMessage];
        });
    }, [incomingMessage, chat?.id]);

    useEffect(() => {
        if (!newMemberEvent || newMemberEvent.chat_id !== chat?.id) return;

        setParticipants((prev) => {
            const exists = prev.some((p) => p.id === newMemberEvent.user.id);
            if (exists) return prev;
            return [...prev, newMemberEvent.user];
        });
    }, [newMemberEvent, chat?.id]);


    return (
        <div className="d-flex flex-column h-100 w-100 bg-white">
            <div className="p-3 border-bottom d-flex align-items-center bg-white shadow-sm" style={{ zIndex: 10 }}>
                <div 
                    className="d-flex justify-content-center align-items-center bg-light text-dark rounded-circle me-3 flex-shrink-0"
                    style={{ width: '48px', height: '48px' }}
                >
                    <i className={`bi ${chat.is_group ? 'bi-people-fill' : 'bi-person-fill'} fs-5`}></i>
                </div>
                <div>
                    <h5 className="mb-0 fw-bold">{chat.name}</h5>
                    <small className="text-muted text-truncate" style={{ maxWidth: '300px', display: 'block' }}>
                        {chat.is_group 
                            ? participants.map(p => p.name || p.username).join(', ') 
                            : 'Chat privata'
                        }
                    </small>
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto p-4 bg-light d-flex flex-column">
                {error && <Alert variant="danger" className="text-center">{error}</Alert>}
                
                {loading ? (
                    <div className="m-auto text-center text-muted">
                        <Spinner animation="border" variant="primary" className="mb-2" />
                        <p>Caricamento chat...</p>
                    </div>
                ) : messages.length === 0 && !error ? (
                    <div className="m-auto text-center text-muted">
                        <p>Nessun messaggio. Scrivi qualcosa per iniziare!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            const isMine = msg.from.id === user?.id;
                            const currentMessageDate = new Date(msg.sent_at).toDateString();
                            const previousMessageDate = index > 0 ? new Date(messages[index - 1].sent_at).toDateString() : null;
                            const showSeparator = currentMessageDate !== previousMessageDate;

                            return (
                                <React.Fragment key={msg.id}>
                                    {showSeparator && (
                                        <div className="d-flex justify-content-center my-3">
                                            <span className="badge bg-secondary bg-opacity-25 text-dark rounded-pill px-3 py-1 fw-normal" style={{ fontSize: '0.8rem' }}>
                                                {formatSeparatorDate(msg.sent_at)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                                        <div 
                                            className={`px-3 py-2 shadow-sm ${isMine ? 'text-white' : 'bg-white text-dark'}`}
                                            style={{ 
                                                maxWidth: '80%',
                                                borderTopLeftRadius: '1.5rem',
                                                borderTopRightRadius: '1.5rem',
                                                borderBottomRightRadius: isMine ? '4px' : '1.5rem',
                                                borderBottomLeftRadius: !isMine ? '4px' : '1.5rem',
                                                backgroundColor: isMine ? '#e65a41' : undefined
                                            }}
                                        >
                                            {!isMine && chat.is_group && (
                                                <div className="small fw-bold mb-1" style={{ color: '#0d6efd', fontSize: '0.8rem' }}>
                                                    {msg.from.name || msg.from.username}
                                                </div>
                                            )}
                                            
                                            <div className="d-flex align-items-end flex-wrap">
                                                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginRight: '1rem' }}>
                                                    {msg.content}
                                                </span>
                                                <span 
                                                    className={`small ms-auto ${isMine ? 'text-white-50' : 'text-muted'}`} 
                                                    style={{ fontSize: '0.7rem', marginBottom: '-2px' }}
                                                >
                                                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="p-3 bg-white border-top">
                <Form onSubmit={handleSendMessage} className="d-flex gap-2 align-items-center">
                    <Form.Control
                        type="text"
                        placeholder="Scrivi un messaggio..."
                        className="rounded-pill bg-light border-0 px-4 py-2"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={loading}
                    />
                    <Button 
                        type="submit" 
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white border-0"
                        style={{ width: '45px', height: '45px', backgroundColor: '#e65a41' }}
                        disabled={!newMessage.trim() || sending || loading}
                    >
                        {sending ? <Spinner size="sm" /> : <i className="bi bi-send-fill"></i>}
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export default ChatRoom;