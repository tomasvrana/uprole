import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../../stores/authStore';
import { getUserProfile } from '../../../services/users';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { toggleLike, deletePost, addComment, getComments, sharePost } from '../../../services/posts';
import LinkPreview from '../../common/LinkPreview/LinkPreview';
import styles from './Post.module.css';

const Post = ({ post, onPostDeleted, onPostUpdated }) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [author, setAuthor] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    // Comments state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount || 0);
    const [shareCount, setShareCount] = useState(post.shareCount || 0);

    const isAuthor = user?.uid === post.authorId;

    useEffect(() => {
        const fetchAuthor = async () => {
            try {
                const profile = await getUserProfile(post.authorId);
                setAuthor(profile);
            } catch (error) {
                console.error('Error fetching post author:', error);
            }
        };
        fetchAuthor();

        if (user && post.likes) {
            setIsLiked(post.likes.includes(user.uid));
        }
    }, [post.authorId, post.likes, user]);

    const handleLike = async () => {
        if (!user) return; // Should navigate to login or show modal

        try {
            await toggleLike(post.id, user.uid, isLiked);
            setIsLiked(!isLiked);
            setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('common.confirmDelete') || 'Are you sure you want to delete this post?')) return;

        try {
            await deletePost(post.id);
            if (onPostDeleted) onPostDeleted(post.id);
        } catch (error) {
            console.error('Error deleting post:', error);
            alert(t('common.error') || 'Failed to delete post');
        }
    };

    const handleToggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setCommentsLoading(true);
            try {
                const fetchedComments = await getComments(post.id);
                setComments(fetchedComments);
            } catch (error) {
                console.error('Error fetching comments:', error);
            } finally {
                setCommentsLoading(false);
            }
        }
        setShowComments(!showComments);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;

        try {
            const newComment = await addComment(post.id, user.uid, commentText);
            setComments(prev => [...prev, newComment]);
            setCommentText('');
            setCommentCount(prev => prev + 1);
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const profileLink = author?.username ? `/@${author.username}` : `/profile/${post.authorId}`;

    const handleShare = async () => {
        if (!user) return;
        if (!window.confirm('Share this post to your wall?')) return;

        try {
            await sharePost(user.uid, post.id);
            setShareCount(prev => prev + 1);
            alert('Post shared successfully!');
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    };

    return (
        <div className={styles.postContainer}>
            <div className={styles.header}>
                <Link to={profileLink} className={styles.authorInfo}>
                    <div className={styles.avatar}>
                        {author?.photoURL ? (
                            <img src={author.photoURL} alt={author.displayName} />
                        ) : (
                            getInitials(author?.displayName)
                        )}
                    </div>
                    <div className={styles.meta}>
                        <span className={styles.userName}>{author?.displayName || 'Loading...'}</span>
                        <span className={styles.time}>
                            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </span>
                    </div>
                </Link>

                {isAuthor && (
                    <div className={styles.menuContainer}>
                        <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                            </svg>
                        </button>
                        {showMenu && (
                            <div className={styles.dropdown}>
                                <button onClick={handleDelete} className={styles.deleteBtn}>
                                    Delete Post
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.postBody}>
                <p className={styles.content}>{post.content}</p>
                {post.media && post.media.filter(url => !!url).length > 0 && (
                    <div className={styles.mediaContainer}>
                        {post.media.filter(url => !!url).map((url, index) => {
                            const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/) || url.includes('/videos/');
                            return (
                                <div key={index} className={styles.mediaItem}>
                                    {isVideo ? (
                                        <video src={url} controls className={styles.media} />
                                    ) : (
                                        <img src={url} alt={`Post attachment ${index + 1}`} className={styles.media} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {post.linkPreview && !post.sharedPostId && (
                    <div style={{ marginBottom: '1rem' }}>
                        <LinkPreview preview={post.linkPreview} />
                    </div>
                )}

                {post.sharedPostId && (
                    <SharedPost postId={post.sharedPostId} />
                )}
            </div>

            <div className={styles.actions}>
                <button
                    className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
                    onClick={handleLike}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{likeCount > 0 ? likeCount : ''} {t('posts.like') || 'Like'}</span>
                </button>

                <button className={styles.actionBtn} onClick={handleToggleComments}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>{commentCount > 0 ? commentCount : ''} {t('posts.comment') || 'Comment'}</span>
                </button>

                <button className={styles.actionBtn} onClick={handleShare}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{shareCount > 0 ? shareCount : ''} {t('posts.share') || 'Share'}</span>
                </button>
            </div>

            {showComments && (
                <div className={styles.commentsSection}>
                    <div className={styles.commentList}>
                        {commentsLoading ? (
                            <div className={styles.loading}>Loading comments...</div>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <Comment key={comment.id} comment={comment} />
                            ))
                        ) : (
                            <div className={styles.noComments}>No comments yet.</div>
                        )}
                    </div>

                    {user && (
                        <form className={styles.commentForm} onSubmit={handleAddComment}>
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className={styles.commentInput}
                            />
                            <button type="submit" className={styles.commentSubmitBtn} disabled={!commentText.trim()}>
                                Post
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

const Comment = ({ comment }) => {
    const [author, setAuthor] = useState(null);

    useEffect(() => {
        const fetchAuthor = async () => {
            try {
                const profile = await getUserProfile(comment.authorId);
                setAuthor(profile);
            } catch (error) {
                console.error('Error fetching comment author:', error);
            }
        };
        fetchAuthor();
    }, [comment.authorId]);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className={styles.commentItem}>
            <div className={styles.commentAvatar}>
                {author?.photoURL ? (
                    <img src={author.photoURL} alt={author.displayName} />
                ) : (
                    getInitials(author?.displayName)
                )}
            </div>
            <div className={styles.commentContent}>
                <div className={styles.commentBubble}>
                    <span className={styles.commentAuthor}>{author?.displayName || 'Loading...'}</span>
                    <p>{comment.text}</p>
                </div>
                <span className={styles.commentTime}>
                    {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                </span>
            </div>
        </div>
    );
};

const SharedPost = ({ postId }) => {
    const [post, setPost] = useState(null);
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSharedPost = async () => {
            try {
                const postRef = doc(db, 'posts', postId);
                const postSnap = await getDoc(postRef);
                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    setPost({ id: postSnap.id, ...postData });
                    const authorProfile = await getUserProfile(postData.authorId);
                    setAuthor(authorProfile);
                }
            } catch (error) {
                console.error('Error fetching shared post:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSharedPost();
    }, [postId]);

    if (loading) return <div className={styles.sharedPostPlaceholder}>Loading shared post...</div>;
    if (!post) return <div className={styles.sharedPostPlaceholder}>Original post was deleted.</div>;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className={styles.sharedPostContainer}>
            <div className={styles.sharedPostHeader}>
                <div className={styles.sharedPostAvatar}>
                    {author?.photoURL ? (
                        <img src={author.photoURL} alt={author.displayName} />
                    ) : (
                        getInitials(author?.displayName)
                    )}
                </div>
                <div className={styles.sharedPostMeta}>
                    <span className={styles.sharedPostAuthor}>{author?.displayName || 'Unknown'}</span>
                    <span className={styles.sharedPostTime}>
                        {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : ''}
                    </span>
                </div>
            </div>
            <div className={styles.sharedPostContent}>
                <p>{post.content}</p>
                {post.media && post.media.length > 0 && (
                    <div className={styles.sharedMedia}>
                        <img src={post.media[0]} alt="Shared content" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Post;
