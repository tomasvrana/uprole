import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getUserProfile } from '../../../services/users';
import styles from './MessagingDropdown.module.css';

const MessagingDropdown = ({ conversations, currentUserId, onClose }) => {
    const [enrichedConversations, setEnrichedConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const enrich = async () => {
            const enriched = await Promise.all(conversations.map(async (conv) => {
                const otherUserId = conv.participants.find(id => id !== currentUserId);
                try {
                    const otherUser = await getUserProfile(otherUserId);
                    return { ...conv, otherUser };
                } catch (error) {
                    console.error('Error fetching other user profile:', error);
                    return conv;
                }
            }));
            setEnrichedConversations(enriched);
            setLoading(false);
        };

        if (currentUserId && conversations.length > 0) {
            enrich();
        } else {
            setLoading(false);
        }
    }, [conversations, currentUserId]);

    return (
        <div className={styles.dropdown}>
            <div className={styles.header}>
                <h3>Messages</h3>
                <Link to="/messages" className={styles.viewAll} onClick={onClose}>
                    See all in Messenger
                </Link>
            </div>
            <div className={styles.list}>
                {loading ? (
                    <div className={styles.empty}>Loading...</div>
                ) : enrichedConversations.length === 0 ? (
                    <div className={styles.empty}>No messages yet</div>
                ) : (
                    enrichedConversations.map((conv) => (
                        <Link
                            key={conv.id}
                            to={`/messages/${conv.id}`}
                            className={`${styles.item} ${conv.unreadCount > 0 ? styles.unread : ''}`}
                            onClick={onClose}
                        >
                            <div className={styles.avatar}>
                                {conv.otherUser?.photoURL ? (
                                    <img src={conv.otherUser.photoURL} alt={conv.otherUser.displayName} />
                                ) : (
                                    <div className={styles.initials}>
                                        {conv.otherUser?.displayName?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.nameRow}>
                                    <span className={styles.name}>{conv.otherUser?.displayName}</span>
                                    <span className={styles.time}>
                                        {conv.updatedAt ? formatDistanceToNow(conv.updatedAt.toDate(), { addSuffix: true }) : ''}
                                    </span>
                                </div>
                                <p className={styles.lastMessage}>
                                    {conv.lastMessage?.senderId === currentUserId ? 'You: ' : ''}
                                    {conv.lastMessage?.text}
                                </p>
                            </div>
                            {conv.unreadCount > 0 && <div className={styles.dot} />}
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default MessagingDropdown;
