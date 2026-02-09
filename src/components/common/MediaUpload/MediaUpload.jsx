import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { validateFile } from '../../../services/storage';
import styles from './MediaUpload.module.css';

const MediaUpload = ({ onFilesSelected, maxFiles = 1, allowedTypes, multiple = false, currentFiles = [] }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);
    const [previews, setPreviews] = useState(currentFiles.map(f => typeof f === 'string' ? f : URL.createObjectURL(f)));

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);

        // 1. Validate number of files
        if (selectedFiles.length + currentFiles.length > maxFiles) {
            alert(t('common.errorMaxFiles') || `Max ${maxFiles} files allowed`);
            return;
        }

        // 2. Validate each file
        const validFiles = [];
        for (const file of selectedFiles) {
            const validation = validateFile(file, { allowedTypes });
            if (validation.valid) {
                validFiles.push(file);
            } else {
                alert(validation.error);
            }
        }

        if (validFiles.length > 0) {
            const newPreviews = validFiles.map(f => URL.createObjectURL(f));
            setPreviews(prev => multiple ? [...prev, ...newPreviews] : newPreviews);
            onFilesSelected(multiple ? [...currentFiles, ...validFiles] : validFiles);
        }
    };

    const removeFile = (index) => {
        const newPreviews = [...previews];
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);

        const newFiles = [...currentFiles];
        newFiles.splice(index, 1);
        onFilesSelected(newFiles);
    };

    return (
        <div className={styles.container}>
            <div className={styles.previews}>
                {previews.map((preview, index) => (
                    <div key={index} className={styles.previewItem}>
                        <img src={preview} alt="Preview" className={styles.previewImage} />
                        <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeFile(index)}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            {previews.length < maxFiles && (
                <div
                    className={styles.uploadArea}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple={multiple}
                        accept={allowedTypes?.join(',')}
                        className={styles.hiddenInput}
                    />
                    <div className={styles.uploadPlaceholder}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>{t('common.addMedia') || 'Add Media'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaUpload;
