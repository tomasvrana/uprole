import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createNotification, NOTIFICATION_TYPES } from './notifications';

const FOLLOWS_COLLECTION = 'follows';

/**
 * Follow a user
 * Creates a document in the follows collection with ID: {followerId}_{followingId}
 */
export const followUser = async (followerId, followingId) => {
    if (!followerId || !followingId || followerId === followingId) {
        throw new Error('Invalid follow request');
    }

    const followDocId = `${followerId}_${followingId}`;
    const followRef = doc(db, FOLLOWS_COLLECTION, followDocId);

    await setDoc(followRef, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
    });

    // Create notification
    await createNotification(followingId, NOTIFICATION_TYPES.FOLLOW, {
        followerId,
        type: 'follow'
    });

    return true;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId, followingId) => {
    if (!followerId || !followingId) {
        throw new Error('Invalid unfollow request');
    }

    const followDocId = `${followerId}_${followingId}`;
    const followRef = doc(db, FOLLOWS_COLLECTION, followDocId);

    await deleteDoc(followRef);

    return true;
};

/**
 * Check if a user is following another user
 */
export const isFollowing = async (followerId, followingId) => {
    if (!followerId || !followingId) return false;

    const followDocId = `${followerId}_${followingId}`;
    const followRef = doc(db, FOLLOWS_COLLECTION, followDocId);
    const followSnap = await getDoc(followRef);

    return followSnap.exists();
};

/**
 * Get all users that a user is following
 */
export const getFollowing = async (userId, limitCount = 50) => {
    if (!userId) return [];

    const followsRef = collection(db, FOLLOWS_COLLECTION);
    const q = query(
        followsRef,
        where('followerId', '==', userId),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Get all followers of a user
 */
export const getFollowers = async (userId, limitCount = 50) => {
    if (!userId) return [];

    const followsRef = collection(db, FOLLOWS_COLLECTION);
    const q = query(
        followsRef,
        where('followingId', '==', userId),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Get follower count for a user
 */
export const getFollowerCount = async (userId) => {
    if (!userId) return 0;
    const followers = await getFollowers(userId, 1000);
    return followers.length;
};

/**
 * Get following count for a user
 */
export const getFollowingCount = async (userId) => {
    if (!userId) return 0;
    const following = await getFollowing(userId, 1000);
    return following.length;
};
