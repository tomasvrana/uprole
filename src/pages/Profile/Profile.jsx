import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore';
import { getUserByUsername, getUserProfile } from '../../services/users';
import { getUserSkills, deleteSkill } from '../../services/skills';
import { followUser, unfollowUser, isFollowing, getFollowers, getFollowing } from '../../services/follows';
import { getOrCreateConversation } from '../../services/chat';
import { getUserPosts } from '../../services/posts';
import PostForm from '../../components/features/Post/PostForm';
import Post from '../../components/features/Post/Post';
import styles from './Profile.module.css';

// Categories for icons
const CATEGORIES = {
    music: '🎵',
    sports: '⚽',
    acting: '🎭',
    dance: '💃',
    circus: '🎪',
    other: '✨',
};

const Profile = () => {
    const { t } = useTranslation();
    const { userId, profileSlug } = useParams();
    const navigate = useNavigate();
    const { user, profile: currentUserProfile, loading: authLoading } = useAuthStore();

    const [viewedProfile, setViewedProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [skills, setSkills] = useState([]);

    // Follow/Social state
    const [isFollowingUser, setIsFollowingUser] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Posts state
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);

    // Expanded videos state (tracks which skill cards have expanded videos)
    const [expandedVideos, setExpandedVideos] = useState({});

    // Parse username from profileSlug if present
    const usernameParam = profileSlug?.startsWith('@') ? profileSlug.substring(1) : null;

    // Determine if viewing own profile or someone else's
    const isOwnProfile =
        (!userId && !profileSlug) || // /profile (redirects usually)
        (usernameParam && currentUserProfile?.username === usernameParam) || // /@myusername
        (userId && user?.uid === userId); // /profile/myid

    useEffect(() => {
        const fetchProfile = async () => {
            // Handle invalid slug (not starting with @)
            if (profileSlug && !profileSlug.startsWith('@')) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            // Redirect logic for empty path
            if (!userId && !profileSlug && currentUserProfile?.username) {
                navigate(`/@${currentUserProfile.username}`, { replace: true });
                return;
            }

            // Login check for empty path
            if (!userId && !profileSlug && !user) {
                setLoading(false);
                return;
            }

            // Viewing own profile
            if (isOwnProfile && currentUserProfile) {
                setViewedProfile(currentUserProfile);

                // Fetch skills for own profile
                try {
                    const userSkills = await getUserSkills(user.uid);
                    setSkills(userSkills);
                } catch (error) {
                    console.error('Error fetching own skills:', error);
                }

                // Fetch social stats for own profile
                try {
                    const followers = await getFollowers(user.uid);
                    const following = await getFollowing(user.uid);
                    setFollowerCount(followers.length);
                    setFollowingCount(following.length);
                } catch (error) {
                    console.error('Error fetching own social stats:', error);
                }

                setLoading(false);
                return;
            }

            let profileToSet = null;

            // Fetch by Username
            if (usernameParam) {
                try {
                    profileToSet = await getUserByUsername(usernameParam);
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    setNotFound(true);
                }
            }
            // Fetch by User ID
            else if (userId) {
                try {
                    profileToSet = await getUserProfile(userId);
                } catch (error) {
                    console.error('Error fetching profile by ID:', error);
                    setNotFound(true);
                }
            }

            if (profileToSet) {
                setViewedProfile(profileToSet);

                // Fetch social stats
                try {
                    const followers = await getFollowers(profileToSet.id);
                    const following = await getFollowing(profileToSet.id);
                    setFollowerCount(followers.length);
                    setFollowingCount(following.length);
                } catch (error) {
                    console.error('Error fetching social stats:', error);
                }

                // Check following status
                if (user && !isOwnProfile) {
                    try {
                        const followingStatus = await isFollowing(user.uid, profileToSet.id);
                        setIsFollowingUser(followingStatus);
                    } catch (error) {
                        console.error('Error checking follow status:', error);
                    }
                }

                // Fetch skills
                try {
                    const userSkills = await getUserSkills(profileToSet.id);
                    setSkills(userSkills);
                } catch (error) {
                    console.error('Error fetching skills:', error);
                }
            } else if (!isOwnProfile && (usernameParam || userId)) {
                setNotFound(true);
            }

            setLoading(false);
        };

        if (!authLoading) {
            fetchProfile();
        }
    }, [userId, profileSlug, usernameParam, user, currentUserProfile, authLoading, navigate, isOwnProfile]);

    const handleFollow = async () => {
        if (!user || !viewedProfile) return;
        setFollowLoading(true);
        try {
            if (isFollowingUser) {
                await unfollowUser(user.uid, viewedProfile.id);
                setIsFollowingUser(false);
                setFollowerCount(prev => Math.max(0, prev - 1));
            } else {
                await followUser(user.uid, viewedProfile.id);
                setIsFollowingUser(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        } finally {
            setFollowLoading(false);
        }
    };
    const fetchPosts = async (profileId) => {
        setPostsLoading(true);
        try {
            const userPosts = await getUserPosts(profileId);
            setPosts(userPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

    const calculateTimePassed = (month, year) => {
        if (!month || !year) return '';
        const now = new Date();
        const start = new Date(year, month - 1);
        const diff = now - start;

        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
        const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

        if (years > 0) return `${years} years${months > 0 ? ` and ${months} months` : ''}`;
        if (months > 0) return `${months} months`;
        return 'Less than a month';
    };

    const handleDeleteSkill = async (skillId) => {
        if (!user || !window.confirm('Are you sure you want to delete this skill?')) return;
        try {
            await deleteSkill(user.uid, skillId);
            setSkills(prev => prev.filter(s => s.id !== skillId));
        } catch (error) {
            console.error('Error deleting skill:', error);
        }
    };

    useEffect(() => {
        const profileId = isOwnProfile ? user?.uid : viewedProfile?.id;
        if (profileId) {
            fetchPosts(profileId);
        }
    }, [isOwnProfile, user?.uid, viewedProfile?.id]);

    const handleMessage = async () => {
        if (!user || !viewedProfile) return;
        try {
            const conversation = await getOrCreateConversation(user.uid, viewedProfile.id);
            navigate(`/messages/${conversation.id}`);
        } catch (error) {
            console.error('Error starting conversation:', error);
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

    const displayProfile = isOwnProfile ? currentUserProfile : viewedProfile;

    if (loading || authLoading) {
        return (
            <div className={styles.profilePage}>
                <div className={styles.loading}>{t('common.loading')}</div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={styles.profilePage}>
                <div className={styles.emptyState}>
                    <h3>User not found</h3>
                    <p>The user {usernameParam ? `@${usernameParam}` : (userId ? `ID: ${userId}` : '')} does not exist.</p>
                    <Link to="/" className="btn btn-primary">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!isOwnProfile && !user) {
        // Allow public view
    }

    if (!userId && !profileSlug && !user) {
        return (
            <div className={styles.profilePage}>
                <div className={styles.emptyState}>
                    <h3>{t('auth.login.title')}</h3>
                    <p>Please log in to view your profile</p>
                    <Link to="/login" className="btn btn-primary">
                        {t('nav.login')}
                    </Link>
                </div>
            </div>
        );
    }

    // User needs to set username first
    if (isOwnProfile && !currentUserProfile?.username) {
        return (
            <div className={styles.profilePage}>
                <div className={styles.emptyState}>
                    <h3>Complete Your Profile</h3>
                    <p>Please set a username to create your public profile URL.</p>
                    <Link to="/profile/edit" className="btn btn-primary">
                        {t('profile.editProfile')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.profilePage}>
            <div className={styles.profileLayout}>
                {/* Left Column: Profile Info & Skills */}
                <div className={styles.leftColumn}>
                    {/* Profile Header */}
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatar}>
                                {displayProfile?.photoURL ? (
                                    <img src={displayProfile.photoURL} alt={displayProfile.displayName} />
                                ) : (
                                    getInitials(displayProfile?.displayName || '?')
                                )}
                            </div>
                        </div>

                        <div className={styles.profileInfo}>
                            <h1 className={styles.profileName}>
                                {displayProfile?.displayName || 'Anonymous'}
                            </h1>
                            {displayProfile?.username && (
                                <div className={styles.profileUsername}>
                                    @{displayProfile.username}
                                </div>
                            )}

                            {displayProfile?.availability && (
                                <div className={`${styles.availabilityBadge} ${styles[displayProfile.availability]}`}>
                                    {t(`profile.availabilityOptions.${displayProfile.availability}`) || displayProfile.availability}
                                </div>
                            )}

                            {displayProfile?.location && (displayProfile.location.city || displayProfile.location.country) && (
                                <div className={styles.profileLocation}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {[displayProfile.location.city, displayProfile.location.country].filter(Boolean).join(', ')}
                                </div>
                            )}

                            <p className={styles.profileBio}>
                                {displayProfile?.bio || (isOwnProfile ? 'Add a bio to tell others about yourself and your performing experience.' : 'No bio yet.')}
                            </p>

                            <div className={styles.profileMeta}>
                                <div className={styles.metaItem}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Joined {new Date(displayProfile?.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                                </div>
                                {displayProfile?.languages?.length > 0 && (
                                    <div className={styles.metaItem}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="2" y1="12" x2="22" y2="12" />
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                        {displayProfile.languages.join(', ')}
                                    </div>
                                )}
                                <div className={styles.metaItem}>
                                    <strong>{followerCount}</strong> Followers
                                </div>
                                <div className={styles.metaItem}>
                                    <strong>{followingCount}</strong> Following
                                </div>
                            </div>
                        </div>

                        <div className={styles.profileActions}>
                            {isOwnProfile ? (
                                <Link to="/profile/edit" className="btn btn-primary">{t('profile.editProfile')}</Link>
                            ) : (
                                <>
                                    <button
                                        className={`btn ${isFollowingUser ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={handleFollow}
                                        disabled={followLoading || !user}
                                    >
                                        {isFollowingUser ? 'Unfollow' : 'Follow'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleMessage}
                                        disabled={!user}
                                    >
                                        Message
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Skills Section */}
                    <section className={styles.skillsSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{t('profile.skills')}</h2>
                            {isOwnProfile && (
                                <Link to="/profile/add-skill" className="btn btn-secondary">{t('profile.addSkill')}</Link>
                            )}
                        </div>

                        {skills.length > 0 ? (
                            <div className={styles.skillsGrid}>
                                {skills.map((skill) => {
                                    const timeSince = calculateTimePassed(skill.startMonth, skill.startYear);
                                    const hasVideos = skill.youtubeLinks?.length > 0;
                                    const isExpanded = expandedVideos[skill.id];
                                    const visibleVideos = isExpanded ? skill.youtubeLinks : skill.youtubeLinks?.slice(0, 1);

                                    // Helper to extract YouTube video ID
                                    const getYouTubeVideoId = (url) => {
                                        if (!url) return null;
                                        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                        const match = url.match(regExp);
                                        return (match && match[2].length === 11) ? match[2] : null;
                                    };

                                    return (
                                        <div key={skill.id} className={styles.skillCard}>
                                            <div className={styles.skillCardHeader}>
                                                <span className={styles.skillCategory}>
                                                    {CATEGORIES[skill.category?.toLowerCase()] || '✨'} {skill.category}
                                                </span>
                                                {skill.skillLevel && (
                                                    <span className={styles.skillLevel}>{skill.skillLevel}</span>
                                                )}
                                            </div>

                                            <h3 className={styles.skillTitle}>{skill.subcategory}</h3>

                                            {timeSince && (
                                                <p className={styles.skillExperienceTime}>{timeSince}</p>
                                            )}

                                            {/* Two Column Layout */}
                                            <div className={styles.skillColumns}>
                                                <div className={styles.skillColumnLeft}>
                                                    {skill.styles?.length > 0 && (
                                                        <div className={styles.skillTags}>
                                                            {skill.styles.map((style) => (
                                                                <span key={style} className={styles.skillTag}>{style}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {skill.source && (
                                                        <div className={styles.skillDetail}>
                                                            <span className={styles.detailLabel}>Source:</span> {skill.source}
                                                        </div>
                                                    )}
                                                    {skill.practising && (
                                                        <div className={styles.skillDetail}>
                                                            <span className={styles.detailLabel}>Practising:</span> {skill.practising}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={styles.skillColumnRight}>
                                                    {skill.influences?.length > 0 && (
                                                        <div className={styles.skillDetail}>
                                                            <span className={styles.detailLabel}>Influences:</span> {skill.influences.join(', ')}
                                                        </div>
                                                    )}
                                                    {skill.equipment?.length > 0 && (
                                                        <div className={styles.skillDetail}>
                                                            <span className={styles.detailLabel}>Equipment:</span> {skill.equipment.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {skill.extras && (skill.extras.canReadNotes || skill.extras.openForNudes || skill.extras.openForDisgrace) && (
                                                <div className={styles.skillExtras}>
                                                    {skill.extras.canReadNotes && <span className={styles.extraBadge}>📖 Can read notes</span>}
                                                    {skill.extras.openForNudes && <span className={styles.extraBadge}>🎭 Open for nudes</span>}
                                                    {skill.extras.openForDisgrace && <span className={styles.extraBadge}>⚡ Open for disgrace</span>}
                                                </div>
                                            )}

                                            {/* YouTube Videos Section */}
                                            {hasVideos && (
                                                <div className={styles.skillVideos}>
                                                    <h4 className={styles.videosTitle}>Videos</h4>
                                                    <div className={styles.videosGrid}>
                                                        {visibleVideos.map((url, index) => {
                                                            const videoId = getYouTubeVideoId(url);
                                                            if (!videoId) return null;
                                                            return (
                                                                <div key={index} className={styles.videoWrapper}>
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${videoId}`}
                                                                        title={`Video ${index + 1}`}
                                                                        frameBorder="0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                        className={styles.videoIframe}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {skill.youtubeLinks.length > 1 && (
                                                        <button
                                                            className={styles.viewMoreBtn}
                                                            onClick={() => setExpandedVideos(prev => ({
                                                                ...prev,
                                                                [skill.id]: !prev[skill.id]
                                                            }))}
                                                        >
                                                            {isExpanded ? '▲ Show less' : `▼ View ${skill.youtubeLinks.length - 1} more videos`}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isOwnProfile && (
                                                <div className={styles.skillActions}>
                                                    <Link to={`/profile/edit-skill/${skill.id}`} className={styles.skillActionBtn}>
                                                        ✏️ Edit
                                                    </Link>
                                                    <button
                                                        className={styles.skillActionBtn + ' ' + styles.deleteBtn}
                                                        onClick={() => handleDeleteSkill(skill.id)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <h3>{t('profile.noSkills')}</h3>
                                <p>{isOwnProfile ? 'Add your first skill to showcase your talents' : 'This user has not added any skills yet.'}</p>
                                {isOwnProfile && (
                                    <Link to="/profile/add-skill" className="btn btn-primary">{t('profile.addSkill')}</Link>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Wall of Posts */}
                <div className={styles.rightColumn}>
                    {/* Posts Section */}
                    <section className={styles.postsSection}>
                        <h2 className={styles.sectionTitle}>{t('profile.posts') || 'Posts'}</h2>

                        {isOwnProfile && (
                            <PostForm onPostCreated={() => fetchPosts(user.uid)} />
                        )}

                        <div className={styles.postsList}>
                            {postsLoading ? (
                                <div className={styles.loading}>{t('common.loading')}</div>
                            ) : posts.length > 0 ? (
                                posts.map(post => (
                                    <Post
                                        key={post.id}
                                        post={post}
                                        onPostDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                                    />
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>{isOwnProfile ? 'You haven\'t posted anything yet.' : 'This user hasn\'t posted anything yet.'}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Profile;
