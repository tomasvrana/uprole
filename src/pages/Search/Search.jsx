import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { searchUsers, getUsersByIds } from '../../services/users';
import { searchSkills, getUserSkills } from '../../services/skills';
import SearchAutocomplete from '../../components/common/SearchAutocomplete/SearchAutocomplete';
import SearchMap from '../../components/common/SearchMap/SearchMap';
import { CATEGORIES, SUBCATEGORIES, SKILL_LEVELS, AVAILABILITY_OPTIONS } from '../../constants/skills';
import styles from './Search.module.css';

// Local categories for emojis if not in constants
const CATEGORY_ICONS = {
    'music': '🎵',
    'sports': '⚽',
    'acting': '🎭',
    'dance': '💃',
    'circus': '🎪',
    'other': '✨',
    'technical': '💻',
    'languages': '🗣️',
};

const Search = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    // Results
    const [results, setResults] = useState([]);

    // Filters (Support arrays for checkboxes)
    const getParamArray = (key) => {
        const val = searchParams.get(key);
        return val ? val.split(',') : [];
    };

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [categories, setCategories] = useState(getParamArray('category'));
    const [subcategories, setSubcategories] = useState(getParamArray('subcategory'));
    const [skillLevels, setSkillLevels] = useState(getParamArray('skillLevel'));
    const [availabilities, setAvailabilities] = useState(getParamArray('availability'));

    // Map Center (London default)
    const [mapCenter, setMapCenter] = useState([51.505, -0.09]);

    useEffect(() => {
        // Sync state from params on load/change
        setQuery(searchParams.get('q') || '');
        setCategories(getParamArray('category'));
        setSubcategories(getParamArray('subcategory'));
        setSkillLevels(getParamArray('skillLevel'));
        setAvailabilities(getParamArray('availability'));
    }, [searchParams]);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                let data = [];
                const searchType = searchParams.get('type');

                // If filtering by skill attributes, use searchSkills
                const hasFilters = categories.length > 0 || subcategories.length > 0 || skillLevels.length > 0 || availabilities.length > 0;

                if (hasFilters || searchType === 'subcategory' || searchType === 'category') {
                    const filters = {
                        category: categories,
                        subcategory: subcategories,
                        experienceLevel: skillLevels,
                        availability: availabilities
                    };

                    // If query exists and it's not the subcategory itself, we might need advanced logic
                    // For now, searchSkills handles filters. 
                    // If type is subcategory, the query IS the subcategory usually.
                    if (searchType === 'subcategory') filters.subcategory = query;
                    if (searchType === 'category') filters.category = query;

                    const skills = await searchSkills(filters, 50);

                    // Fetch users for these skills
                    const userIds = [...new Set(skills.map(s => s.userId))];

                    if (userIds.length > 0) {
                        // Import getUsersByIds at top of file, or assuming it's available
                        // We need to update the import statement too!
                        data = await getUsersByIds(userIds);

                        // Client-side text filter if query exists and wasn't used for category
                        if (query && searchType !== 'subcategory' && searchType !== 'category' && categories.length === 0 && subcategories.length === 0) {
                            const searchLower = query.toLowerCase();
                            data = data.filter(user =>
                                user.displayName?.toLowerCase().includes(searchLower) ||
                                user.location?.city?.toLowerCase().includes(searchLower)
                            );
                        }
                    } else {
                        data = [];
                    }
                } else {
                    // Default User Search (Text search)
                    // If NO query and NO filters, should we show everyone or empty?
                    // User requested "If a user has no skill added, they should not be visible" implies 
                    // maybe we should default to showing nothing or only "featured"?
                    // For now, if query is empty, maybe show nothing until they search?
                    // Or keep showing all public users?
                    // Let's stick to standard search behavior: Show all if empty, filter by text if present.
                    // But maybe filter out users without ANY location/data if that's the complaint?

                    // Note: searchUsers returns all public users if query is empty
                    const allUsers = await searchUsers(query, 50);

                    // Filter out users who might not be relevant if that's the goal?
                    // For now, let's just make sure they are valid
                    data = allUsers;
                }

                // Fetch skills for all resulting users
                const resultsWithSkills = await Promise.all(data.map(async (u) => {
                    try {
                        const uSkills = await getUserSkills(u.id);
                        return { ...u, skills: uSkills || [] };
                    } catch (e) {
                        console.error(`Error fetching skills for user ${u.id}:`, e);
                        return { ...u, skills: [] };
                    }
                }));

                setResults(resultsWithSkills);

                // Update map center if first result has location
                if (data.length > 0 && data[0].location?.lat) {
                    setMapCenter([data[0].location.lat, data[0].location.lng]);
                }

                // Polyfill: Geocode results with missing coordinates (for existing users)
                const missingCoords = data.filter(u => u.location?.city && (!u.location.lat || !u.location.lng));
                if (missingCoords.length > 0) {
                    const cities = [...new Set(missingCoords.map(u => `${u.location.city}, ${u.location.country || ''}`))];

                    // Limit to 3 requests to be nice to the API
                    cities.slice(0, 3).forEach(async (query) => {
                        try {
                            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                            if (resp.ok) {
                                const geoData = await resp.json();
                                if (geoData && geoData.length > 0) {
                                    setResults(prev => prev.map(u => {
                                        const uQuery = `${u.location?.city}, ${u.location?.country || ''}`;
                                        if (uQuery === query) {
                                            return {
                                                ...u,
                                                location: {
                                                    ...u.location,
                                                    lat: parseFloat(geoData[0].lat),
                                                    lng: parseFloat(geoData[0].lon)
                                                }
                                            };
                                        }
                                        return u;
                                    }));
                                }
                            }
                        } catch (e) {
                            console.error('Auto-geocode error:', e);
                        }
                    });
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, categories, subcategories, skillLevels, availabilities, searchParams]);

    const handleSearch = (q, type) => {
        const params = new URLSearchParams(searchParams);
        if (q) params.set('q', q);
        else params.delete('q');

        if (type) params.set('type', type);
        else params.delete('type');

        // Reset other filters if new search
        if (type === 'category') {
            params.set('category', q);
            params.delete('subcategory');
            params.delete('q'); // Query is the category
        }

        setSearchParams(params);
    };

    const updateFilter = (key, value) => {
        const params = new URLSearchParams(searchParams);
        const currentVal = params.get(key);
        let values = currentVal ? currentVal.split(',') : [];

        if (values.includes(value)) {
            values = values.filter(v => v !== value);
        } else {
            values.push(value);
        }

        if (values.length > 0) params.set(key, values.join(','));
        else params.delete(key);

        setSearchParams(params);
    };

    return (
        <div className={styles.searchPage}>
            {/* Top Bar: Search & Filters */}
            <div className={styles.searchHeader}>
                <div className={styles.searchBarWrapper}>
                    <SearchAutocomplete
                        initialValue={query}
                        onSearch={handleSearch}
                        placeholder={t('search.placeholder')}
                    />
                </div>

                <div className={styles.filtersBar}>
                    {/* Category Group */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t('skill.category') || 'Categories'}</label>
                        <div className={styles.checkboxList}>
                            {Object.values(CATEGORIES).map(cat => (
                                <label key={cat} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={categories.includes(cat)}
                                        onChange={() => updateFilter('category', cat)}
                                    />
                                    <span>{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Subcategory Group (Only show if parent category selected? Or all matching?) */}
                    {categories.length > 0 && (
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>{t('skill.subcategory') || 'Subcategories'}</label>
                            <div className={styles.checkboxList}>
                                {categories.map(cat => (
                                    SUBCATEGORIES[cat]?.map(sub => (
                                        <label key={sub} className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={subcategories.includes(sub)}
                                                onChange={() => updateFilter('subcategory', sub)}
                                            />
                                            <span>{sub}</span>
                                        </label>
                                    ))
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Level Group */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t('skill.experienceLevel') || 'Levels'}</label>
                        <div className={styles.checkboxList}>
                            {SKILL_LEVELS.map(lvl => (
                                <label key={lvl} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={skillLevels.includes(lvl)}
                                        onChange={() => updateFilter('skillLevel', lvl)}
                                    />
                                    <span>{lvl}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Availability Group */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t('skill.availability') || 'Availability'}</label>
                        <div className={styles.checkboxList}>
                            {AVAILABILITY_OPTIONS.map(opt => (
                                <label key={opt} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={availabilities.includes(opt)}
                                        onChange={() => updateFilter('availability', opt)}
                                    />
                                    <span>{t(`profile.availabilityOptions.${opt}`) || opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area: Split View */}
            <div className={styles.contentArea}>
                {/* Left: Results */}
                <div className={styles.resultsColumn}>
                    <div className={styles.resultsMeta}>
                        {loading ? 'Searching...' : `${results.length} results found`}
                    </div>

                    <div className={styles.resultsList}>
                        {results.map(user => (
                            <div key={user.id} className={styles.resultCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.avatar}>
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName} />
                                        ) : (
                                            <div className={styles.initials}>{(user.displayName || '?')[0]}</div>
                                        )}
                                    </div>
                                    <div className={styles.userInfo}>
                                        <h4>{user.displayName}</h4>
                                        <div className={styles.subtext}>
                                            {user.location ? `${user.location.city}, ${user.location.country}` : 'No location'}
                                        </div>
                                    </div>
                                    {user.availability && (
                                        <div className={`${styles.badge} ${styles[user.availability]}`}>
                                            {user.availability}
                                        </div>
                                    )}
                                </div>

                                {user.skills?.length > 0 && (
                                    <div className={styles.skillsPreview}>
                                        {user.skills.map(skill => (
                                            <div key={skill.id} className={styles.skillEntry}>
                                                <span className={styles.skillTag}>
                                                    {CATEGORY_ICONS[skill.category?.toLowerCase()] || '✨'} {skill.subcategory}
                                                </span>
                                                <span className={styles.skillMeta}>
                                                    {skill.skillLevel && <span className={styles.lvl}>{skill.skillLevel}</span>}
                                                    {skill.styles?.length > 0 && (
                                                        <span className={styles.stylesList}>• {skill.styles.join(', ')}</span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Link to={`/profile/${user.id}`} className={styles.viewProfileBtn}>
                                    View Profile
                                </Link>
                            </div>
                        ))}

                        {!loading && results.length === 0 && (
                            <div className={styles.emptyState}>
                                No results found. Try adjusting filters.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Map */}
                <div className={styles.mapColumn}>
                    <SearchMap users={results} center={mapCenter} />
                </div>
            </div>
        </div>
    );
};

export default Search;
