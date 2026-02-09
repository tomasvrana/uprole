import { searchUsers } from './users';
import { searchSkills } from './skills';
import { CATEGORIES, SUBCATEGORIES } from '../constants/skills';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

/**
 * Get aggregated search suggestions
 * @param {string} text - Search query
 * @returns {Promise<Array>} - Array of suggestions
 */
export const getSearchSuggestions = async (text) => {
    if (!text || text.length < 2) return [];

    const lowerText = text.toLowerCase();
    const suggestions = [];

    // 1. Skill Categories & Subcategories (Client-side match)
    Object.values(CATEGORIES).forEach(category => {
        if (category.toLowerCase().includes(lowerText)) {
            suggestions.push({
                type: 'category',
                label: category,
                value: category
            });
        }
    });

    Object.entries(SUBCATEGORIES).forEach(([category, subs]) => {
        subs.forEach(sub => {
            if (sub.toLowerCase().includes(lowerText)) {
                suggestions.push({
                    type: 'subcategory',
                    label: sub,
                    value: sub,
                    category // Keep context of parent category
                });
            }
        });
    });

    // 2. Users (DB Search) - Limit to 5
    try {
        const users = await searchUsers(text, 5);
        users.forEach(user => {
            suggestions.push({
                type: 'user',
                label: user.displayName,
                value: user.username || user.id,
                id: user.id,
                image: user.photoURL,
                subtext: user.username ? `@${user.username}` : ''
            });
        });
    } catch (e) {
        console.error('Error fetching user suggestions', e);
    }

    // 3. Locations (Nominatim - OpenStreetMap)
    // We only trigger this if the text looks like a place (optional check, or just always)
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=3&featuretype=city`);
        if (response.ok) {
            const locations = await response.json();
            locations.forEach(loc => {
                // Deduplicate if already present (unlikely across types)
                const parts = loc.display_name.split(', ');
                const label = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : loc.display_name; // City, Country

                suggestions.push({
                    type: 'location',
                    label: label,
                    value: label,
                    lat: loc.lat,
                    lon: loc.lon
                });
            });
        }
    } catch (e) {
        console.error('Error fetching location suggestions', e);
    }

    return suggestions;
};
