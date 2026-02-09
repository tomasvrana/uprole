/**
 * Cloudflare R2 Storage Service
 * Handles uploading files via presigned URLs
 */

const STORAGE_API_URL = import.meta.env.VITE_STORAGE_API_URL;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

/**
 * Upload a file to R2 via the Proxy Worker
 * @param {File} file - The file object
 * @param {string} fileName - The desired key in R2
 * @param {function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const uploadFileToR2 = async (file, fileName, onProgress) => {
    if (!STORAGE_API_URL) {
        throw new Error('VITE_STORAGE_API_URL is not configured');
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        // Direct PUT to the worker URL with the filename in the path
        const uploadUrl = STORAGE_API_URL.endsWith('/') ? STORAGE_API_URL : `${STORAGE_API_URL}/`;
        xhr.open('PUT', `${uploadUrl}${encodeURIComponent(fileName)}`);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
};

/**
 * Construct the public URL for an R2 object
 * @param {string} fileName - Key of the object in R2
 * @returns {string} - Publicly accessible URL
 */
export const getR2PublicUrl = (fileName) => {
    if (!fileName) return '';
    // If it's already a full URL, just return it
    if (typeof fileName === 'string' && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
        return fileName;
    }
    if (!R2_PUBLIC_URL) return '';
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    return `${baseUrl}${fileName}`;
};
