import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../../stores/authStore';
import { createPost } from '../../../services/posts';
import { uploadFile } from '../../../services/storage';
import { extractUrl, getLinkPreview } from '../../../services/linkPreview';
import MediaUpload from '../../common/MediaUpload/MediaUpload';
import LinkPreview from '../../common/LinkPreview/LinkPreview';
import styles from './PostForm.module.css';

const PostForm = ({ onPostCreated }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuthStore();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [linkPreview, setLinkPreview] = useState(null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);

    // Check for URLs and fetch preview
    useEffect(() => {
        const checkUrl = setTimeout(async () => {
            const url = extractUrl(content);

            // If no URL found, do nothing (keep existing preview sticky)
            if (!url) return;

            // If URL found is same as current preview, do nothing
            if (linkPreview && linkPreview.url === url) return;

            // New URL found (or no current preview), fetch and replace
            setIsFetchingPreview(true);
            const preview = await getLinkPreview(url);
            if (preview) {
                setLinkPreview(preview);
            }
            setIsFetchingPreview(false);
        }, 1000); // Debounce 1s

        return () => clearTimeout(checkUrl);
    }, [content, linkPreview]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setLoading(true);
        setError(null);

        try {
            let mediaUrls = [];

            // 1. Upload files if any
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file =>
                    uploadFile(file, `posts/${user.uid}`, (progress) => {
                        // For multi-file we could average this, but for now just showing activity
                        setUploadProgress(progress);
                    })
                );
                mediaUrls = await Promise.all(uploadPromises);
            }

            // 2. Create post with media URLs and link preview
            await createPost(user.uid, content, mediaUrls, linkPreview);

            setContent('');
            setSelectedFiles([]);
            setLinkPreview(null);
            setUploadProgress(0);
            if (onPostCreated) onPostCreated();
        } catch (err) {
            console.error('Error creating post:', err);
            setError('Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className={styles.postFormContainer}>
            <div className={styles.formHeader}>
                <div className={styles.avatar}>
                    {profile?.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} />
                    ) : (
                        getInitials(profile?.displayName || user?.email)
                    )}
                </div>
                <span className={styles.userName}>{profile?.displayName || 'User'}</span>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('posts.placeholder') || "What's on your mind?"}
                    className={styles.textarea}
                    disabled={loading}
                />

                {/* Link Preview Section */}
                {linkPreview && (
                    <div style={{ marginBottom: '1rem' }}>
                        <LinkPreview
                            preview={linkPreview}
                            onClose={() => setLinkPreview(null)}
                            editable={true}
                        />
                    </div>
                )}

                <div className={styles.mediaSection}>
                    <MediaUpload
                        onFilesSelected={setSelectedFiles}
                        currentFiles={selectedFiles}
                        maxFiles={4}
                        multiple={true}
                        allowedTypes={['image/jpeg', 'image/png', 'image/webp', 'video/mp4']}
                    />
                </div>

                {loading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.formActions}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !content.trim()}
                    >
                        {loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostForm;
