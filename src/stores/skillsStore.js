import { create } from 'zustand';
import { searchSkills, getSkillCategories } from '../services/skills';

const useSkillsStore = create((set, get) => ({
    skills: [],
    categories: [],
    filters: {
        category: null,
        subcategory: null,
        experienceLevel: null,
        availability: null,
        searchQuery: '',
    },
    loading: false,
    error: null,

    setFilters: (newFilters) => {
        set({ filters: { ...get().filters, ...newFilters } });
    },

    clearFilters: () => {
        set({
            filters: {
                category: null,
                subcategory: null,
                experienceLevel: null,
                availability: null,
                searchQuery: '',
            },
        });
    },

    fetchSkills: async () => {
        const { filters } = get();
        set({ loading: true, error: null });

        try {
            const skills = await searchSkills(filters);
            set({ skills, loading: false });
        } catch (error) {
            console.error('Error fetching skills:', error);
            set({ error: error.message, loading: false });
        }
    },

    fetchCategories: async () => {
        try {
            const categories = await getSkillCategories();
            set({ categories });
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    },

    clearError: () => set({ error: null }),
}));

export default useSkillsStore;
