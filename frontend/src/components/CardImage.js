// components/CardImage.js
// Final clean version without badge

import React, { useState, useEffect } from 'react';
import { Box, Image } from '@chakra-ui/react';

const CardImage = ({
  src,
  alt,
  width,
  height,
  fallbackSrc = '/placeholder.png',
  objectFit = "cover",
  borderRadius = "md",
  loading = "lazy",
  ...otherProps
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [hasTriedEnglish, setHasTriedEnglish] = useState(false);

  // Convert Asia-EN URL to English URL
  const getEnglishUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (!url.includes('asia-en.onepiece-cardgame.com')) return null;
    return url.replace('asia-en.onepiece-cardgame.com', 'en.onepiece-cardgame.com');
  };

  // Check if URL is already English version
  const isAlreadyEnglishUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('en.onepiece-cardgame.com') && !url.includes('asia-en.onepiece-cardgame.com');
  };

  useEffect(() => {
    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    // Reset state
    setHasTriedEnglish(false);

    // If it's already an English URL, use it as-is
    if (isAlreadyEnglishUrl(src)) {
      setCurrentSrc(src);
      setHasTriedEnglish(true);
      return;
    }

    // If it's an Asia-EN URL, try English version
    const englishUrl = getEnglishUrl(src);
    if (englishUrl) {
      setCurrentSrc(englishUrl);
      setHasTriedEnglish(true);
    } else {
      // Not a convertible URL, use original
      setCurrentSrc(src);
      setHasTriedEnglish(true);
    }
  }, [src, fallbackSrc]);

  const handleImageLoad = () => {
    // Image loaded successfully - no action needed
  };

  const handleImageError = () => {
    // If we failed to load an English version, try the original Asia-EN version
    if (hasTriedEnglish && isAlreadyEnglishUrl(currentSrc)) {
      const originalUrl = currentSrc.replace('en.onepiece-cardgame.com', 'asia-en.onepiece-cardgame.com');
      setCurrentSrc(originalUrl);
    } else {
      // If original also fails, use fallback
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <Box
      position="relative"
      width={width}
      height={height}
      borderRadius={borderRadius}
      overflow="hidden"
      {...otherProps}
    >
      <Image
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        objectFit={objectFit}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={loading}
      />
    </Box>
  );
};

export default CardImage;
