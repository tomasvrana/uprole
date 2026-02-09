import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFollowedFeed, getGlobalFeed } from '../../../services/posts';
import { getFollowing } from '../../../services/follows';
import Post from '../Post/Post';
import styles from './Feed.module.css';

const Feed = ({ userId, type = 'followed' }) => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFeed = async () => {
        setLoading(true);
        try {
            let feedPosts = [];
            if (type === 'followed' && userId) {
                const following = await getFollowing(userId);
                const followedIds = following.map(f => f.followingId);

                // Include own posts in the feed too for better UX
                const uids = [userId, ...followedIds];
                feedPosts = await getFollowedFeed(uids);
            } else {
                feedPosts = await getGlobalFeed();
            }
            setPosts(feedPosts);
        } catch (err) {
            console.error('Error fetching feed:', err);
            setError('Failed to load feed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, [userId, type]);

    if (loading) {
        return <div className={styles.loading}>{t('common.loading')}</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.feedContainer}>
            {posts.length > 0 ? (
                posts.map(post => (
                    <Post
                        key={post.id}
                        post={post}
                        onPostDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                    />
                ))
            ) : (
                <div className={styles.emptyFeed}>
                    <p>{type === 'followed' ? t('posts.emptyFollowedFeed') || 'No posts from people you follow yet. Start following people to see their posts here!' : 'No posts yet.'}</p>
                </div>
            )}
        </div>
    );
};

export default Feed;
