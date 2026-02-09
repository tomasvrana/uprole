import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createNotification, NOTIFICATION_TYPES } from './notifications';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Generate a consistent conversation ID from two user IDs
 * Always orders IDs alphabetically for consistency
 */
const generateConversationId = (userId1, userId2) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (userId1, userId2) => {
    if (!userId1 || !userId2 || userId1 === userId2) {
        throw new Error('Invalid conversation request');
    }

    const conversationId = generateConversationId(userId1, userId2);
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() };
    }

    // Create new conversation
    const newConversation = {
        participants: [userId1, userId2],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null,
    };

    await setDoc(conversationRef, newConversation);

    return { id: conversationId, ...newConversation };
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId, senderId, text) => {
    if (!conversationId || !senderId || !text.trim()) {
        throw new Error('Invalid message');
    }

    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);

    const message = {
        senderId,
        text: text.trim(),
        createdAt: serverTimestamp(),
        read: false,
    };

    const docRef = await addDoc(messagesRef, message);

    // Update conversation's last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        const convData = conversationSnap.data();
        // Update conversation's last message and recipient's unread count
        const recipientId = convData.participants.find(id => id !== senderId);
        const updateData = {
            lastMessage: {
                text: text.trim(),
                senderId,
                createdAt: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
        };

        if (recipientId) {
            updateData[`unreadCount_${recipientId}`] = increment(1);
        }

        await updateDoc(conversationRef, updateData);

        // Create notification for the recipient
        if (recipientId) {
            await createNotification(recipientId, NOTIFICATION_TYPES.MESSAGE, {
                conversationId,
                senderId,
                text: text.trim().substring(0, 50) + (text.length > 50 ? '...' : '')
            });
        }
    }

    return { id: docRef.id, ...message };
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId, limitCount = 50) => {
    if (!conversationId) return [];

    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    const q = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Subscribe to messages in a conversation (real-time)
 */
export const subscribeToMessages = (conversationId, callback) => {
    if (!conversationId) {
        console.error('No conversation ID provided');
        return () => { };
    }

    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        callback(messages);
    });
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId, limitCount = 50) => {
    if (!userId) return [];

    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const conversations = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            unreadCount: data[`unreadCount_${userId}`] || 0
        };
    });

    // Client-side sort by updatedAt
    return conversations.sort((a, b) =>
        (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
    );
};

/**
 * Subscribe to conversations for a user (real-time)
 */
export const subscribeToConversations = (userId, callback) => {
    if (!userId) {
        console.error('No user ID provided');
        return () => { };
    }

    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
    );

    return onSnapshot(q, async (snapshot) => {
        const conversations = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                unreadCount: data[`unreadCount_${userId}`] || 0
            };
        });

        // Client-side sort
        conversations.sort((a, b) =>
            (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
        );

        callback(conversations);
    });
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId, userId) => {
    if (!conversationId || !userId) return;

    // Reset unread count for this user in the conversation doc
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const updateData = {};
    updateData[`unreadCount_${userId}`] = 0;
    await updateDoc(conversationRef, updateData);

    // Also mark individual messages as read (optional, for detailed UI)
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    const q = query(
        messagesRef,
        where('read', '==', false),
        where('senderId', '!=', userId)
    );

    const querySnapshot = await getDocs(q);
    const updates = querySnapshot.docs.map((doc) =>
        updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updates);
};
