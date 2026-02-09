import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore';
import { logout } from '../../services/auth';
import { subscribeToNotifications } from '../../services/notifications';
import { subscribeToConversations } from '../../services/chat';
import { useClickOutside } from '../../hooks/useClickOutside';
import NotificationDropdown from './NotificationDropdown/NotificationDropdown';
import MessagingDropdown from './MessagingDropdown/MessagingDropdown';
import SearchAutocomplete from '../common/SearchAutocomplete/SearchAutocomplete';
import styles from './Header.module.css';

const Header = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [notifications, setNotifications] = useState([]);
    const [conversations, setConversations] = useState([]);

    const messagesRef = useRef(null);
    const notificationsRef = useRef(null);
    const userMenuRef = useRef(null);

    useClickOutside(messagesRef, () => setMessagesOpen(false));
    useClickOutside(notificationsRef, () => setNotificationsOpen(false));
    useClickOutside(userMenuRef, () => setDropdownOpen(false));

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setConversations([]);
            return;
        }

        const unsubNotifications = subscribeToNotifications(user.uid, setNotifications);
        const unsubConversations = subscribeToConversations(user.uid, setConversations);

        return () => {
            unsubNotifications();
            unsubConversations();
        };
    }, [user]);

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;
    const unreadMessagesCount = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
    };

    const handleLogout = async () => {
        try {
            await logout();
            setDropdownOpen(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getProfileLink = () => {
        if (profile?.username) {
            return `/@${profile.username}`;
        }
        return '/profile/edit';
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <Link to="/" className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            <path d="M2 12h20" />
                        </svg>
                    </div>
                    UpRole
                </Link>

                <div className={styles.searchForm}>
                    <div className={styles.searchWrapper}>
                        <SearchAutocomplete
                            initialValue={searchQuery}
                            onSearch={(q, type) => {
                                navigate(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`);
                                setSearchQuery('');
                            }}
                            placeholder={t('search.placeholder')}
                        />
                    </div>
                </div>

                <div className={styles.navActions}>
                    <div className={styles.langSwitcher}>
                        <button
                            className={`${styles.langBtn} ${i18n.language === 'en' ? styles.active : ''}`}
                            onClick={() => changeLanguage('en')}
                        >
                            EN
                        </button>
                        <button
                            className={`${styles.langBtn} ${i18n.language === 'cs' ? styles.active : ''}`}
                            onClick={() => changeLanguage('cs')}
                        >
                            CS
                        </button>
                    </div>

                    {user ? (
                        <div className={styles.authActions}>
                            <div className={styles.iconActions}>
                                {/* Messages Icon */}
                                <div className={styles.iconWrapper} ref={messagesRef}>
                                    <button
                                        className={`${styles.navIconBtn} ${messagesOpen ? styles.active : ''}`}
                                        onClick={() => {
                                            setMessagesOpen(!messagesOpen);
                                            setNotificationsOpen(false);
                                            setDropdownOpen(false);
                                        }}
                                        aria-label="Messages"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        {unreadMessagesCount > 0 && (
                                            <span className={styles.badge}>{unreadMessagesCount}</span>
                                        )}
                                    </button>
                                    {messagesOpen && (
                                        <MessagingDropdown
                                            conversations={conversations}
                                            currentUserId={user.uid}
                                            onClose={() => setMessagesOpen(false)}
                                        />
                                    )}
                                </div>

                                {/* Notifications Icon */}
                                <div className={styles.iconWrapper} ref={notificationsRef}>
                                    <button
                                        className={`${styles.navIconBtn} ${notificationsOpen ? styles.active : ''}`}
                                        onClick={() => {
                                            setNotificationsOpen(!notificationsOpen);
                                            setMessagesOpen(false);
                                            setDropdownOpen(false);
                                        }}
                                        aria-label="Notifications"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </svg>
                                        {unreadNotificationsCount > 0 && (
                                            <span className={styles.badge}>{unreadNotificationsCount}</span>
                                        )}
                                    </button>
                                    {notificationsOpen && (
                                        <NotificationDropdown
                                            notifications={notifications}
                                            onClose={() => setNotificationsOpen(false)}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={styles.userMenu} ref={userMenuRef}>
                                <button
                                    className={`${styles.userAvatar} ${dropdownOpen ? styles.active : ''}`}
                                    onClick={() => {
                                        setDropdownOpen(!dropdownOpen);
                                        setMessagesOpen(false);
                                        setNotificationsOpen(false);
                                    }}
                                    aria-label="User menu"
                                >
                                    {profile?.photoURL ? (
                                        <img src={profile.photoURL} alt={profile.displayName} />
                                    ) : (
                                        getInitials(profile?.displayName || user.email)
                                    )}
                                </button>

                                <div className={`${styles.dropdown} ${dropdownOpen ? styles.open : ''}`}>
                                    <Link
                                        to="/messages"
                                        className={styles.dropdownItem}
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        {t('nav.messages') || 'Messages'}
                                    </Link>
                                    <Link
                                        to={getProfileLink()}
                                        className={styles.dropdownItem}
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {t('nav.profile')}
                                    </Link>
                                    <div className={styles.dropdownDivider} />
                                    <button className={styles.dropdownItem} onClick={handleLogout}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        {t('nav.logout')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.authButtons}>
                            <Link to="/login" className={`btn ${styles.loginBtn}`}>
                                {t('nav.login')}
                            </Link>
                            <Link to="/register" className="btn btn-primary">
                                {t('nav.register')}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
