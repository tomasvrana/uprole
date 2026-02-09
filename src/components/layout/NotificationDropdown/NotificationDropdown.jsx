import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getUserProfile } from '../../../services/users';
import { markNotificationAsRead } from '../../../services/notifications';
import styles from './NotificationDropdown.module.css';

const NotificationDropdown = ({ notifications, onClose }) => {
    const [enrichedNotifications, setEnrichedNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const enrich = async () => {
            const enriched = await Promise.all(notifications.map(async (n) => {
                const senderId = n.data?.userId || n.data?.followerId || n.data?.senderId;
                if (senderId) {
                    try {
                        const profile = await getUserProfile(senderId);
                        return { ...n, sender: profile };
                    } catch (error) {
                        console.error('Error fetching sender profile:', error);
                    }
                }
                return n;
            }));
            setEnrichedNotifications(enriched);
            setLoading(false);
        };

        enrich();
    }, [notifications]);

    const handleNotificationClick = async (n) => {
        if (!n.read) {
            await markNotificationAsRead(n.id);
        }
        onClose();
    };

    return (
        <div className={styles.dropdown}>
            <div className={styles.header}>
                <h3>Notifications</h3>
            </div>
            <div className={styles.list}>
                {loading ? (
                    <div className={styles.empty}>Loading...</div>
                ) : enrichedNotifications.length === 0 ? (
                    <div className={styles.empty}>No notifications yet</div>
                ) : (
                    enrichedNotifications.map((n) => (
                        <Link
                            key={n.id}
                            to={
                                n.type === 'follow' ? `/@${n.sender?.username || ''}` :
                                    (n.type === 'like' || n.type === 'comment' || n.type === 'share') ? `/profile/${n.recipientId}` :
                                        (n.type === 'new_skill' || n.type === 'new_video') ? `/profile/${n.data?.userId || ''}` :
                                            `/messages/${n.data?.conversationId || ''}`
                            }
                            className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                            onClick={() => handleNotificationClick(n)}
                        >
                            <div className={styles.avatar}>
                                {n.sender?.photoURL ? (
                                    <img src={n.sender.photoURL} alt={n.sender.displayName} />
                                ) : (
                                    <div className={styles.initials}>
                                        {n.sender?.displayName?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className={styles.content}>
                                <p className={styles.text}>
                                    <strong>{n.sender?.displayName || 'Someone'}</strong>{' '}
                                    {n.type === 'follow' && 'followed you'}
                                    {n.type === 'message' && 'sent you a message'}
                                    {n.type === 'like' && 'liked your post'}
                                    {n.type === 'comment' && 'commented on your post'}
                                    {n.type === 'share' && 'shared your post'}
                                    {n.type === 'new_skill' && `added a new skill: ${n.data?.subcategory || n.data?.category || 'a skill'}`}
                                    {n.type === 'new_video' && `added ${n.data?.videoCount > 1 ? `${n.data.videoCount} new videos` : 'a new video'} to ${n.data?.subcategory || 'their skill'}`}
                                </p>
                                {n.type === 'message' && n.data?.text && (
                                    <p className={styles.preview}>{n.data.text}</p>
                                )}
                                <span className={styles.time}>
                                    {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                </span>
                            </div>
                            {!n.read && <div className={styles.dot} />}
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
