import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFeaturedUsers } from '../../services/users';
import useAuthStore from '../../stores/authStore';
import PostForm from '../../components/features/Post/PostForm';
import Feed from '../../components/features/Post/Feed';
import styles from './Home.module.css';

const CATEGORIES = [
    { id: 'music', icon: '🎵' },
    { id: 'sports', icon: '⚽' },
    { id: 'acting', icon: '🎭' },
    { id: 'dance', icon: '💃' },
    { id: 'circus', icon: '🎪' },
    { id: 'other', icon: '✨' },
];

const Home = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [featuredUsers, setFeaturedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedKey, setFeedKey] = useState(0); // For refreshing feed after new post

    useEffect(() => {
        const fetchFeaturedUsers = async () => {
            try {
                const users = await getFeaturedUsers(6);
                setFeaturedUsers(users);
            } catch (error) {
                console.error('Error fetching featured users:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeaturedUsers();
    }, []);

    const handlePostCreated = () => {
        setFeedKey(prev => prev + 1);
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

    const getLocationString = (location) => {
        if (!location) return null;
        const parts = [location.city, location.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    return (
        <div className={styles.homePage}>
            {user ? (
                <div className={styles.authenticatedContent}>
                    <aside className={styles.sidebar}>
                        <section className={styles.sidebarSection}>
                            <h3>{t('home.categories.title')}</h3>
                            <div className={styles.categoryList}>
                                {CATEGORIES.map((category) => (
                                    <Link key={category.id} to={`/search?category=${category.id}`} className={styles.categoryItem}>
                                        <span>{category.icon}</span>
                                        {t(`home.categories.${category.id}`)}
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section className={styles.sidebarSection}>
                            <h3>{t('home.featured.title')}</h3>
                            <div className={styles.miniTalentGrid}>
                                {featuredUsers.slice(0, 3).map(u => (
                                    <Link key={u.id} to={u.username ? `/@${u.username}` : `/profile/${u.id}`} className={styles.miniTalentCard}>
                                        <div className={styles.miniAvatar}>
                                            {u.photoURL ? <img src={u.photoURL} alt={u.displayName} /> : getInitials(u.displayName)}
                                        </div>
                                        <span>{u.displayName}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </aside>

                    <main className={styles.mainFeed}>
                        <PostForm onPostCreated={handlePostCreated} />
                        <Feed key={feedKey} userId={user.uid} type="followed" />
                    </main>
                </div>
            ) : (
                <>
                    {/* Hero Section */}
                    <section className={styles.hero}>
                        <div className={styles.heroContent}>
                            <h1 className={styles.heroTitle}>{t('home.hero.title')}</h1>
                            <p className={styles.heroSubtitle}>{t('home.hero.subtitle')}</p>
                            <div className={styles.heroCta}>
                                <Link to="/search" className="btn btn-primary btn-lg">
                                    {t('home.hero.cta')}
                                </Link>
                                <Link to="/register" className="btn btn-secondary btn-lg">
                                    {t('nav.register')}
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Categories Section */}
                    <section className={styles.categories}>
                        <h2 className={styles.sectionTitle}>{t('home.categories.title')}</h2>
                        <div className={styles.categoryGrid}>
                            {CATEGORIES.map((category) => (
                                <Link
                                    key={category.id}
                                    to={`/search?category=${category.id}`}
                                    className={styles.categoryCard}
                                >
                                    <div className={styles.categoryIcon}>{category.icon}</div>
                                    <span className={styles.categoryName}>
                                        {t(`home.categories.${category.id}`)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Featured Talent Section */}
                    <section className={styles.featured}>
                        <h2 className={styles.sectionTitle}>{t('home.featured.title')}</h2>
                        {loading ? (
                            <div className={styles.loadingState}>{t('common.loading')}</div>
                        ) : featuredUsers.length > 0 ? (
                            <div className={styles.featuredGrid}>
                                {featuredUsers.map((user) => (
                                    <div key={user.id} className={styles.talentCard}>
                                        <div className={styles.talentHeader}>
                                            <div className={styles.talentAvatar}>
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} />
                                                ) : (
                                                    getInitials(user.displayName)
                                                )}
                                            </div>
                                            <div className={styles.talentInfo}>
                                                <h3>{user.displayName || 'Anonymous'}</h3>
                                                {getLocationString(user.location) && (
                                                    <p>{getLocationString(user.location)}</p>
                                                )}
                                            </div>
                                        </div>
                                        {user.bio && (
                                            <p className={styles.talentBio}>
                                                {user.bio.length > 100 ? user.bio.slice(0, 100) + '...' : user.bio}
                                            </p>
                                        )}
                                        <Link
                                            to={user.username ? `/@${user.username}` : `/profile/${user.id}`}
                                            className={`btn btn-secondary ${styles.viewProfile}`}
                                        >
                                            {t('home.featured.viewProfile')}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>No featured talent yet. Be the first to join!</p>
                                <Link to="/register" className="btn btn-primary">
                                    {t('nav.register')}
                                </Link>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Stats Section */}
            <section className={styles.stats}>
                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <div className={styles.statNumber}>{featuredUsers.length || '0'}</div>
                        <div className={styles.statLabel}>Performers</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statNumber}>6</div>
                        <div className={styles.statLabel}>Skill Categories</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statNumber}>--</div>
                        <div className={styles.statLabel}>Countries</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statNumber}>--</div>
                        <div className={styles.statLabel}>Connections Made</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
