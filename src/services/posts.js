import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createNotification, NOTIFICATION_TYPES } from './notifications';

const POSTS_COLLECTION = 'posts';
const COMMENTS_COLLECTION = 'comments';

/**
 * Create a new post
 */
export const createPost = async (userId, content, media = [], linkPreview = null) => {
    if (!userId || !content.trim()) {
        throw new Error('Invalid post data');
    }

    const postData = {
        authorId: userId,
        content: content.trim(),
        media,
        linkPreview,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);
    return { id: docRef.id, ...postData };
};

/**
 * Update a post
 */
export const updatePost = async (postId, updates) => {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const data = {
        ...updates,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(postRef, data);
    return data;
};

/**
 * Delete a post
 */
export const deletePost = async (postId) => {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
};

/**
 * Get posts by a specific user
 */
export const getUserPosts = async (userId, limitCount = 20) => {
    const postsRef = collection(db, POSTS_COLLECTION);
    const q = query(
        postsRef,
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Like/Unlike a post
 */
export const toggleLike = async (postId, userId, isLiked) => {
    const postRef = doc(db, POSTS_COLLECTION, postId);

    if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
            likes: arrayRemove(userId),
            likeCount: increment(-1)
        });
    } else {
        // Like
        await updateDoc(postRef, {
            likes: arrayUnion(userId),
            likeCount: increment(1)
        });

        // Get post to find author for notification
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const post = postSnap.data();
            if (post.authorId !== userId) {
                await createNotification(post.authorId, NOTIFICATION_TYPES.LIKE, {
                    postId,
                    userId,
                    type: 'like'
                });
            }
        }
    }
};

/**
 * Add a comment to a post
 */
export const addComment = async (postId, userId, text) => {
    if (!text.trim()) throw new Error('Comment cannot be empty');

    const commentData = {
        postId,
        authorId: userId,
        text: text.trim(),
        createdAt: serverTimestamp(),
    };

    const commentRef = await addDoc(collection(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION), commentData);

    // Update comment count on post
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
        commentCount: increment(1)
    });

    // Notify author
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
        const post = postSnap.data();
        if (post.authorId !== userId) {
            await createNotification(post.authorId, NOTIFICATION_TYPES.COMMENT, {
                postId,
                userId,
                commentId: commentRef.id,
                text: text.trim().substring(0, 50)
            });
        }
    }

    return { id: commentRef.id, ...commentData };
};

/**
 * Get comments for a post
 */
export const getComments = async (postId) => {
    const commentsRef = collection(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Share a post (creates a new post that references the original)
 */
export const sharePost = async (userId, originalPostId, comment = '') => {
    const originalPostRef = doc(db, POSTS_COLLECTION, originalPostId);
    const originalSnap = await getDoc(originalPostRef);

    if (!originalSnap.exists()) throw new Error('Original post not found');

    const originalPost = originalSnap.data();

    const postData = {
        authorId: userId,
        content: comment.trim(),
        sharedPostId: originalPostId,
        originalAuthorId: originalPost.authorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
    };

    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);

    // Increment share count on original post
    await updateDoc(originalPostRef, {
        shareCount: increment(1)
    });

    // Notify original author
    if (originalPost.authorId !== userId) {
        await createNotification(originalPost.authorId, NOTIFICATION_TYPES.SHARE, {
            postId: originalPostId,
            userId,
            newPostId: docRef.id
        });
    }

    return { id: docRef.id, ...postData };
};

/**
 * Get feed for a user (posts from people they follow)
 */
export const getFollowedFeed = async (followedUserIds, limitCount = 20) => {
    if (!followedUserIds || followedUserIds.length === 0) return [];

    const postsRef = collection(db, POSTS_COLLECTION);

    // Firestore 'in' query supports up to 30 items
    const uids = followedUserIds.slice(0, 30);

    const q = query(
        postsRef,
        where('authorId', 'in', uids),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get global feed (all posts)
 */
export const getGlobalFeed = async (limitCount = 20) => {
    const postsRef = collection(db, POSTS_COLLECTION);
    const q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
