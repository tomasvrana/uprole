/**
 * Service to fetch link previews (oEmbed) for YouTube and Vimeo
 */

// Regex patterns for supported video platforms
const PATTERNS = {
    youtube: /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    vimeo: /(?:vimeo\.com\/)(?:channels\/(?:[^\/]+\/)?|groups\/(?:[^\/]+\/)?|album\/(?:[^\/]+\/)?|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i
};

/**
 * Extract URL from text (simplistic, detects first match)
 * @param {string} text 
 * @returns {string|null}
 */
export const extractUrl = (text) => {
    if (!text) return null;
    const words = text.split(/\s+/);
    const url = words.find(w => w.startsWith('http://') || w.startsWith('https://'));
    return url || null;
};

/**
 * Check if URL is supported
 * @param {string} url 
 * @returns {string|null} 'youtube', 'vimeo', or null
 */
export const getPlatform = (url) => {
    if (!url) return null;
    if (PATTERNS.youtube.test(url)) return 'youtube';
    if (PATTERNS.vimeo.test(url)) return 'vimeo';
    return null;
};

/**
 * Fetch oEmbed data
 * @param {string} url 
 * @returns {Promise<object|null>}
 */
export const getLinkPreview = async (url) => {
    const platform = getPlatform(url);
    if (!platform) return null;

    let oEmbedUrl = '';

    if (platform === 'youtube') {
        oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (platform === 'vimeo') {
        oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    }

    try {
        const response = await fetch(oEmbedUrl);
        if (!response.ok) throw new Error('Failed to fetch preview');

        const data = await response.json();

        return {
            url,
            title: data.title,
            description: data.description || '',
            thumbnail: data.thumbnail_url,
            siteName: data.provider_name,
            type: data.type,
            html: data.html // The embed code
        };
    } catch (error) {
        console.error('Error fetching link preview:', error);
        return null;
    }
};
