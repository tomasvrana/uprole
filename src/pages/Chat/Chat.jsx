import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore';
import {
    getUserConversations,
    getMessages,
    sendMessage,
    subscribeToMessages,
    subscribeToConversations,
    markMessagesAsRead
} from '../../services/chat';
import { getUserProfile } from '../../services/users';
import styles from './Chat.module.css';

const Chat = () => {
    const { t } = useTranslation();
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const messagesEndRef = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState({});

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Subscribe to conversations list
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToConversations(user.uid, async (updatedConversations) => {
            // Enrich conversations with participant info
            const enriched = await Promise.all(updatedConversations.map(async (conv) => {
                const otherUserId = conv.participants.find(id => id !== user.uid);
                let otherUser = participants[otherUserId];

                if (!otherUser) {
                    try {
                        otherUser = await getUserProfile(otherUserId);
                        setParticipants(prev => ({ ...prev, [otherUserId]: otherUser }));
                    } catch (error) {
                        console.error('Error fetching participant:', error);
                    }
                }

                return {
                    ...conv,
                    otherUser: otherUser || { displayName: 'Unknown User' }
                };
            }));

            setConversations(enriched);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Handle current conversation selection and message subscription
    useEffect(() => {
        if (!conversationId || !user) {
            setCurrentConversation(null);
            setMessages([]);
            return;
        }

        const selected = conversations.find(c => c.id === conversationId);
        if (selected) {
            setCurrentConversation(selected);
            markMessagesAsRead(conversationId, user.uid);
        }

        const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, [conversationId, user, conversations]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !conversationId) return;

        try {
            await sendMessage(conversationId, user.uid, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) return <div className={styles.loading}>{t('common.loading')}</div>;

    return (
        <div className={styles.chatContainer}>
            {/* Sidebar list of conversations */}
            <div className={`${styles.sidebar} ${conversationId ? styles.hiddenOnMobile : ''}`}>
                <div className={styles.sidebarHeader}>
                    <h2>Messages</h2>
                </div>
                <div className={styles.conversationList}>
                    {conversations.length === 0 ? (
                        <div className={styles.emptyState}>No messages yet</div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`${styles.conversationItem} ${conv.id === conversationId ? styles.active : ''}`}
                                onClick={() => navigate(`/messages/${conv.id}`)}
                            >
                                <div className={styles.avatar}>
                                    {conv.otherUser?.photoURL ? (
                                        <img src={conv.otherUser.photoURL} alt={conv.otherUser.displayName} />
                                    ) : (
                                        getInitials(conv.otherUser?.displayName)
                                    )}
                                </div>
                                <div className={styles.conversationInfo}>
                                    <h4 className={styles.userName}>{conv.otherUser?.displayName}</h4>
                                    <p className={styles.lastMessage}>
                                        {conv.lastMessage?.senderId === user.uid ? 'You: ' : ''}
                                        {conv.lastMessage?.text || 'No messages'}
                                    </p>
                                </div>
                                {conv.lastMessage && (
                                    <span className={styles.timestamp}>
                                        {new Date(conv.updatedAt?.seconds * 1000).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`${styles.chatArea} ${!conversationId ? styles.hiddenOnMobile : ''}`}>
                {conversationId ? (
                    <>
                        <div className={styles.chatHeader}>
                            <button className={styles.backButton} onClick={() => navigate('/messages')}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                            <div className={styles.headerInfo}>
                                <h3>{currentConversation?.otherUser?.displayName}</h3>
                            </div>
                        </div>

                        <div className={styles.messagesList}>
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`${styles.messageBubble} ${msg.senderId === user.uid ? styles.sent : styles.received}`}
                                >
                                    <p>{msg.text}</p>
                                    <span className={styles.messageTime}>
                                        {new Date(msg.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className={styles.messageInput} onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                            />
                            <button type="submit" disabled={!newMessage.trim()}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.noSelection}>
                        <div className={styles.noSelectionContent}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <h3>Select a conversation</h3>
                            <p>Choose a chat from the left to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
