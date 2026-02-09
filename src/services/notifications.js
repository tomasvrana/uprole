import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc,
    getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const NOTIFICATION_TYPES = {
    FOLLOW: 'follow',
    MESSAGE: 'message',
    LIKE: 'like',
    COMMENT: 'comment',
    SHARE: 'share',
    NEW_SKILL: 'new_skill',
    NEW_VIDEO: 'new_video'
};

/**
 * Create a new notification
 */
export const createNotification = async (recipientId, type, data) => {
    if (!recipientId || !type) return;

    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            recipientId,
            type,
            data,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

/**
 * Subscribe to notifications for a user
 */
export const subscribeToNotifications = (userId, callback) => {
    if (!userId) return () => { };

    // Note: This query requires an index on recipientId + createdAt DESC
    // If that fails, we can fall back to client-side sorting or just simple query
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);

    // Simple query first to avoid index issues
    const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        limit(20)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side sort
        notifications.sort((a, b) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        callback(notifications);
    });
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) return;

    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
        read: true
    });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
    if (!userId) return;

    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientId', '==', userId),
        where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(doc =>
        updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updates);
};
