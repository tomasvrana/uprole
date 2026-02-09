import { uploadFileToR2, getR2PublicUrl } from './r2';

/**
 * Upload a file to Cloudflare R2
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g., 'users/userId/skills/skillId')
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Public URL
 */
export const uploadFile = async (file, path, onProgress) => {
    const fileName = `${path}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    try {
        // 1. Upload directly to the Proxy Worker
        await uploadFileToR2(file, fileName, onProgress);

        // 2. Return the public URL
        return getR2PublicUrl(fileName);
    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw error;
    }
};

/**
 * Upload multiple files
 * @param {File[]} files - Array of files
 * @param {string} path - Storage path
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string[]>} - Array of download URLs
 */
export const uploadMultipleFiles = async (files, path, onProgress) => {
    const totalFiles = files.length;
    let completedFiles = 0;

    const uploadPromises = files.map(async (file) => {
        const url = await uploadFile(file, path, (progress) => {
            if (onProgress) {
                const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
                onProgress(overallProgress);
            }
        });
        completedFiles++;
        return url;
    });

    return Promise.all(uploadPromises);
};

/**
 * Delete a file (Note: Direct deletion from frontend requires worker support)
 * @param {string} fileUrl - The public URL of the file
 */
export const deleteFile = async (fileUrl) => {
    console.warn('Direct R2 deletion from frontend is currently not implemented. This should be handled via a worker endpoint.');
};

/**
 * Delete all files in a directory
 * @param {string} path - Storage path
 */
export const deleteDirectory = async (path) => {
    console.warn('Direct R2 directory deletion from frontend is not implemented.');
};

/**
 * Get file type from file object
 * @param {File} file
 * @returns {'image' | 'video' | 'audio' | 'document' | 'other'}
 */
export const getFileType = (file) => {
    const mimeType = file.type;

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';

    return 'other';
};

/**
 * Validate file size and type
 * @param {File} file
 * @param {Object} options
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFile = (file, options = {}) => {
    const {
        maxSizeMB = 10,
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
    } = options;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
        return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
};
