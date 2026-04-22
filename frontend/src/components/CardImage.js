// components/CardImage.js

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

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  const handleImageError = () => {
    setCurrentSrc(fallbackSrc);
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
        onError={handleImageError}
        loading={loading}
      />
    </Box>
  );
};

export default CardImage;
