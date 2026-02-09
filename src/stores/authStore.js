import { create } from 'zustand';
import { isFirebaseConfigured, auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    loading: isFirebaseConfigured,
    error: null,

    initialize: () => {
        // If Firebase is not configured, return a no-op unsubscribe
        if (!isFirebaseConfigured || !auth) {
            set({ loading: false });
            return () => { };
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                set({ user, loading: true });
                try {
                    // Dynamically import user services only when needed
                    const { getUserProfile, createUserProfile } = await import('../services/users');

                    let profile = await getUserProfile(user.uid);

                    // Create profile if it doesn't exist (first-time login)
                    if (!profile) {
                        profile = await createUserProfile(user.uid, {
                            displayName: user.displayName || '',
                            email: user.email,
                            photoURL: user.photoURL || '',
                            bio: '',
                            location: null,
                            languages: [],
                        });
                    }

                    set({ profile, loading: false, error: null });
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    set({ error: error.message, loading: false });
                }
            } else {
                set({ user: null, profile: null, loading: false, error: null });
            }
        });

        return unsubscribe;
    },

    setProfile: (profile) => set({ profile }),

    updateProfile: (updates) => {
        const currentProfile = get().profile;
        set({ profile: { ...currentProfile, ...updates } });
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
