import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';

export const createUserProfile = async (userId, userData) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const data = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublic: true,
    };
    await setDoc(userRef, data);
    return data;
};

export const getUserProfile = async (userId) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
};

export const updateUserProfile = async (userId, updates) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const data = {
        ...updates,
        updatedAt: serverTimestamp(),
    };

    // If username is being updated, we should ideally handle it in a transaction
    // but for now, we'll just update the user doc.
    // The uniqueness check should be done before calling this.

    await updateDoc(userRef, data);

    if (updates.username) {
        const usernameRef = doc(db, USERNAMES_COLLECTION, updates.username.toLowerCase());
        await setDoc(usernameRef, { userId });
    }

    return data;
};

export const isUsernameAvailable = async (username) => {
    if (!username) return false;
    const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);
    return !usernameSnap.exists();
};

export const getUserByUsername = async (username) => {
    if (!username) return null;
    const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);
    if (!usernameSnap.exists()) return null;

    const { userId } = usernameSnap.data();
    return getUserProfile(userId);
};

export const deleteUserProfile = async (userId) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
};

export const searchUsers = async (searchTerm, limitCount = 50) => {
    // Note: Firestore doesn't support full-text search natively
    // We fetch recent public users and filter client-side to avoid complex indexing requirements
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
        usersRef,
        where('isPublic', '==', true),
        limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Client-side sort by displayName
    return users.sort((a, b) =>
        (a.displayName || '').localeCompare(b.displayName || '')
    );
};

export const getFeaturedUsers = async (limitCount = 6) => {
    // Fetch more than needed to ensure we have enough after client-side sort/filter
    // avoiding composite index requirement for now
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
        usersRef,
        where('isPublic', '==', true),
        limit(20)
    );
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt desc
    return users
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, limitCount);
};

export const getUsersByIds = async (userIds) => {
    if (!userIds || userIds.length === 0) return [];

    // Firestore 'in' query supports up to 10 items.
    // For larger sets, we need to batch or just Promise.all getDoc
    // Since search results are paginated/limited (e.g. 50), parallel getDoc is robust enough for now
    // or batches of 10.

    // Using parallel getDoc for simplicity and reliability
    try {
        const uniqueIds = [...new Set(userIds)];
        const userPromises = uniqueIds.map(id => getUserProfile(id));
        const users = await Promise.all(userPromises);
        return users.filter(user => user !== null);
    } catch (error) {
        console.error('Error fetching users by IDs:', error);
        return [];
    }
};
