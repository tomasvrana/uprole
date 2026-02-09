import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    collectionGroup,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createNotification, NOTIFICATION_TYPES } from './notifications';
import { getFollowers } from './follows';

const SKILLS_SUBCOLLECTION = 'skills';

/**
 * Notify all followers of a user about a new skill or video
 */
const notifyFollowers = async (userId, type, data) => {
    try {
        const followers = await getFollowers(userId, 1000);
        const notifications = followers.map(follow =>
            createNotification(follow.followerId, type, {
                ...data,
                userId
            })
        );
        await Promise.all(notifications);
    } catch (error) {
        console.error('Error notifying followers:', error);
    }
};

export const addSkill = async (userId, skillData) => {
    console.log('skillsService: addSkill called', { userId, skillData });
    try {
        const skillsRef = collection(db, 'users', userId, SKILLS_SUBCOLLECTION);
        // Ensure no undefined values in skillData
        const cleanData = JSON.parse(JSON.stringify(skillData));
        const data = {
            ...cleanData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        console.log('skillsService: saving data', data);
        const docRef = await addDoc(skillsRef, data);
        console.log('skillsService: docRef id', docRef.id);

        // Notify followers about new skill
        await notifyFollowers(userId, NOTIFICATION_TYPES.NEW_SKILL, {
            skillId: docRef.id,
            category: skillData.category,
            subcategory: skillData.subcategory
        });

        return { id: docRef.id, ...data };
    } catch (e) {
        console.error('skillsService: error in addSkill', e);
        throw e;
    }
};

export const getSkill = async (userId, skillId) => {
    const skillRef = doc(db, 'users', userId, SKILLS_SUBCOLLECTION, skillId);
    const skillSnap = await getDoc(skillRef);
    if (skillSnap.exists()) {
        return { id: skillSnap.id, ...skillSnap.data() };
    }
    return null;
};

export const getUserSkills = async (userId) => {
    const skillsRef = collection(db, 'users', userId, SKILLS_SUBCOLLECTION);
    const q = query(skillsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateSkill = async (userId, skillId, updates) => {
    const skillRef = doc(db, 'users', userId, SKILLS_SUBCOLLECTION, skillId);

    // Get existing skill to check for new videos
    const existingSkillSnap = await getDoc(skillRef);
    const existingSkill = existingSkillSnap.exists() ? existingSkillSnap.data() : null;

    const data = {
        ...updates,
        updatedAt: serverTimestamp(),
    };
    await updateDoc(skillRef, data);

    // Check if new YouTube videos were added
    if (existingSkill && updates.youtubeLinks) {
        const oldLinks = existingSkill.youtubeLinks || [];
        const newLinks = updates.youtubeLinks || [];
        const addedLinks = newLinks.filter(link => link && !oldLinks.includes(link));

        if (addedLinks.length > 0) {
            await notifyFollowers(userId, NOTIFICATION_TYPES.NEW_VIDEO, {
                skillId,
                category: updates.category || existingSkill.category,
                subcategory: updates.subcategory || existingSkill.subcategory,
                videoCount: addedLinks.length
            });
        }
    }

    return data;
};

export const deleteSkill = async (userId, skillId) => {
    const skillRef = doc(db, 'users', userId, SKILLS_SUBCOLLECTION, skillId);
    await deleteDoc(skillRef);
};

// Search skills across all users
export const searchSkills = async (filters = {}, limitCount = 20) => {
    const skillsRef = collectionGroup(db, SKILLS_SUBCOLLECTION);
    let q = query(skillsRef);

    if (filters.category) {
        if (Array.isArray(filters.category) && filters.category.length > 0) {
            q = query(q, where('category', 'in', filters.category));
        } else if (!Array.isArray(filters.category)) {
            q = query(q, where('category', '==', filters.category));
        }
    }

    if (filters.subcategory) {
        if (Array.isArray(filters.subcategory) && filters.subcategory.length > 0) {
            q = query(q, where('subcategory', 'in', filters.subcategory));
        } else if (!Array.isArray(filters.subcategory)) {
            q = query(q, where('subcategory', '==', filters.subcategory));
        }
    }

    if (filters.experienceLevel) {
        if (Array.isArray(filters.experienceLevel) && filters.experienceLevel.length > 0) {
            q = query(q, where('skillLevel', 'in', filters.experienceLevel));
        } else if (!Array.isArray(filters.experienceLevel)) {
            q = query(q, where('skillLevel', '==', filters.experienceLevel));
        }
    }

    if (filters.availability) {
        if (Array.isArray(filters.availability) && filters.availability.length > 0) {
            q = query(q, where('availability', 'in', filters.availability));
        } else if (!Array.isArray(filters.availability)) {
            q = query(q, where('availability', '==', filters.availability));
        }
    }

    q = query(q, orderBy('createdAt', 'desc'), limit(limitCount));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        userId: doc.ref.parent.parent.id,
        ...doc.data(),
    }));
};

// Get skill categories for taxonomy
export const getSkillCategories = async () => {
    const categoriesRef = collection(db, 'skillCategories');
    const querySnapshot = await getDocs(categoriesRef);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
