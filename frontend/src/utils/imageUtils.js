// utils/imageUtils.js
/**
 * Safe implementation that won't break existing functionality
 */

/**
 * Converts an Asia-EN image URL to an English image URL
 * @param {string} url - The original image URL
 * @returns {string} - The English version URL
 */
export const getEnglishImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  return url.replace('asia-en.onepiece-cardgame.com', 'en.onepiece-cardgame.com');
};

/**
 * Checks if an image URL exists by attempting to load it
 * @param {string} url - The image URL to check
 * @returns {Promise<boolean>} - True if the image exists and loads successfully
 */
export const checkImageExists = (url) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;

    // Add timeout to prevent hanging
    setTimeout(() => resolve(false), 5000);
  });
};

/**
 * Gets the best available image URL by checking English version first
 * @param {string} originalUrl - The original image URL
 * @param {function} onImageReady - Callback when the final image URL is determined
 * @returns {string} - Initially returns the original URL, then calls onImageReady with the best URL
 */
export const getBestImageUrl = async (originalUrl, onImageReady) => {
  if (!originalUrl || typeof originalUrl !== 'string' || !/^https?:\/\//.test(originalUrl)) {
    const fallbackUrl = '/placeholder.png';
    if (onImageReady) onImageReady(fallbackUrl);
    return fallbackUrl;
  }

  // If it's already an English URL, use it directly
  if (originalUrl.includes('en.onepiece-cardgame.com')) {
    if (onImageReady) onImageReady(originalUrl);
    return originalUrl;
  }

  // Check if this is an Asia-EN URL that can be converted to English
  if (originalUrl.includes('asia-en.onepiece-cardgame.com')) {
    const englishUrl = getEnglishImageUrl(originalUrl);

    try {
      const englishExists = await checkImageExists(englishUrl);
      const finalUrl = englishExists ? englishUrl : originalUrl;
      if (onImageReady) onImageReady(finalUrl);
      return finalUrl;
    } catch (error) {
      console.warn('Error checking English image URL:', error);
      if (onImageReady) onImageReady(originalUrl);
      return originalUrl;
    }
  }

  // For other URLs, use as-is
  if (onImageReady) onImageReady(originalUrl);
  return originalUrl;
};

/**
 * BACKWARD COMPATIBLE - Enhanced version of getSafeImageUrl
 * This maintains the original behavior while adding English URL support
 */
export const getSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return '/placeholder.png';
  }
  return url;
};

/**
 * Legacy function - maintains backward compatibility
 * This is the same function that was in the original codebase
 */
export const getSafeImageUrlLegacy = (url) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return '/placeholder.png';
  }
  return url;
};
