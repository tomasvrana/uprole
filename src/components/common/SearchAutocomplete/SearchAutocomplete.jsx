import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSearchSuggestions } from '../../../services/search';
import styles from './SearchAutocomplete.module.css';

const SearchAutocomplete = ({ initialValue = '', onSearch, placeholder }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.trim().length < 2) {
                setSuggestions([]);
                return;
            }

            setLoading(true);
            try {
                const results = await getSearchSuggestions(query);
                setSuggestions(results);
                setIsOpen(RESULTS_HAVE_ITEMS(results));
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [query]);

    const RESULTS_HAVE_ITEMS = (results) => results.length > 0;

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.label);
        setIsOpen(false);

        if (suggestion.type === 'user') {
            navigate(suggestion.value.startsWith('@') ? `/${suggestion.value}` : `/profile/${suggestion.id}`);
        } else {
            // For skills and locations, we trigger a search
            if (onSearch) {
                onSearch(suggestion.value, suggestion.type);
            } else {
                navigate(`/search?q=${encodeURIComponent(suggestion.value)}&type=${suggestion.type}`);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsOpen(false);
        if (onSearch) {
            onSearch(query);
        } else {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const groupBy = (array, key) => {
        return array.reduce((result, currentValue) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
            return result;
        }, {});
    };

    const groupedSuggestions = groupBy(suggestions, 'type');

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputWrapper}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder={placeholder || t('search.placeholder')}
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => {
                            if (suggestions.length > 0) setIsOpen(true);
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={() => {
                                setQuery('');
                                setSuggestions([]);
                                setIsOpen(false);
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </form>

            {isOpen && (suggestions.length > 0) && (
                <div className={styles.dropdown}>
                    {groupedSuggestions.category && (
                        <div className={styles.group}>
                            <div className={styles.groupTitle}>{t('common.categories') || 'Categories'}</div>
                            {groupedSuggestions.category.map((item, idx) => (
                                <div key={`cat-${idx}`} className={styles.item} onClick={() => handleSuggestionClick(item)}>
                                    <span className={styles.icon}>📂</span>
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {groupedSuggestions.subcategory && (
                        <div className={styles.group}>
                            <div className={styles.groupTitle}>{t('common.skills') || 'Skills'}</div>
                            {groupedSuggestions.subcategory.map((item, idx) => (
                                <div key={`sub-${idx}`} className={styles.item} onClick={() => handleSuggestionClick(item)}>
                                    <span className={styles.icon}>🎯</span>
                                    <div>
                                        <div className={styles.label}>{item.label}</div>
                                        <div className={styles.subtext}>{item.category}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {groupedSuggestions.user && (
                        <div className={styles.group}>
                            <div className={styles.groupTitle}>{t('common.people') || 'People'}</div>
                            {groupedSuggestions.user.map((item, idx) => (
                                <div key={`user-${idx}`} className={styles.item} onClick={() => handleSuggestionClick(item)}>
                                    {item.image ? (
                                        <img src={item.image} alt="" className={styles.avatar} />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>{item.label[0]}</div>
                                    )}
                                    <div>
                                        <div className={styles.label}>{item.label}</div>
                                        {item.subtext && <div className={styles.subtext}>{item.subtext}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {groupedSuggestions.location && (
                        <div className={styles.group}>
                            <div className={styles.groupTitle}>{t('common.locations') || 'Locations'}</div>
                            {groupedSuggestions.location.map((item, idx) => (
                                <div key={`loc-${idx}`} className={styles.item} onClick={() => handleSuggestionClick(item)}>
                                    <span className={styles.icon}>📍</span>
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchAutocomplete;
