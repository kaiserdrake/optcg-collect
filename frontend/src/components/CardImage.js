// components/CardImage.js
import React, { useState } from 'react';
import { Box, Image, Spinner, Center } from '@chakra-ui/react';

const CardImage = ({
  src,
  alt,
  width,
  height,
  fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgdmlld0JveD0iMCAwIDE2MCAyMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMjI0IiBmaWxsPSIjRjdGQUZDIiBzdHJva2U9IiNFMkU4RjAiLz4KPHRleHQgeD0iODAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K',
  objectFit = "cover",
  borderRadius = "md",
  ...otherProps
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
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
      {/* Loading Spinner - shown while image is loading */}
      {isLoading && (
        <Center
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="gray.50"
          zIndex={1}
        >
          <Spinner
            size="md"
            color="gray.400"
            thickness="2px"
          />
        </Center>
      )}

      {/* Main Image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        objectFit={objectFit}
        onLoad={handleLoad}
        onError={handleError}
        opacity={isLoading ? 0 : 1}
        transition="opacity 0.2s ease-in-out"
      />

      {/* Fallback Image - shown when main image fails to load */}
      {hasError && (
        <Image
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          objectFit={objectFit}
          position="absolute"
          top={0}
          left={0}
          opacity={isLoading ? 0 : 1}
          transition="opacity 0.2s ease-in-out"
        />
      )}
    </Box>
  );
};

export default CardImage;
