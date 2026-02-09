import { useState } from 'react';
import styles from './LinkPreview.module.css';

const LinkPreview = ({ preview, onClose, editable = false }) => {
    if (!preview) return null;

    const handleClick = (e) => {
        if (editable) return; // Don't do anything in edit mode (PostForm)
        e.stopPropagation();
        window.open(preview.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={styles.previewContainer} onClick={handleClick}>
            {onClose && (
                <button
                    className={styles.closeBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    type="button"
                    aria-label="Remove preview"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}

            <div className={styles.previewContent}>
                <div className={styles.thumbnailContainer}>
                    {preview.thumbnail && (
                        <img
                            src={preview.thumbnail}
                            alt={preview.title}
                            className={styles.thumbnail}
                        />
                    )}
                    {!editable && (
                        <div className={styles.playIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    )}
                </div>

                <div className={styles.meta}>
                    <div className={styles.siteName}>{preview.siteName}</div>
                    <div className={styles.title}>{preview.title}</div>
                </div>
            </div>
        </div>
    );
};

export default LinkPreview;
