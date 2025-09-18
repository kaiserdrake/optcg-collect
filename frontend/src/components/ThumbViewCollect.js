'use client';

import React from 'react';
import {
  Box, Text, VStack, HStack, Tag, Grid
} from '@chakra-ui/react';
import CardImage from './CardImage';
import { getTagStyles } from '@/utils/cardStyles';

const ThumbViewCollect = ({ cards, onCardClick, showProxies, thumbnailSize = 160 }) => {
  const ThumbnailCard = ({ card }) => {
    if (!card) return null;

    const tagStyles = getTagStyles(card.color);

    // Determine count display text for Collection mode
    const ownedCount = card.owned_count || 0;
    const proxyCount = card.proxy_count || 0;
    const countDisplay = showProxies ?
      `${ownedCount}/${proxyCount}` : `${ownedCount}`;

    const cardWidth = thumbnailSize;
    const cardHeight = Math.floor(thumbnailSize * 1.4);

    return (
      <Box
        borderRadius="md"
        overflow="hidden"
        cursor="pointer"
        onClick={() => onCardClick(card)}
        _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
        transition="all 0.2s"
        bg="white"
        shadow="md"
        position="relative"
        width={`${cardWidth}px`}
        height={`${cardHeight}px`}
        suppressHydrationWarning={true}
      >
        <CardImage
          width={`${cardWidth}px`}
          height={`${cardHeight}px`}
          src={card.img_url || ''}
          alt={card.name || 'Card'}
          fallbackSrc="/placeholder.png"
          objectFit="cover"
          loading="lazy"
        />

        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          width="100%"
          bg="rgba(0,0,0,0.7)"
          color="white"
          pt={2}
          pb={2}
          px={2}
          zIndex={1}
        >
          <HStack align="stretch" spacing={2}>
            {/* Left side - Name and Code in separate lines */}
            <VStack spacing={1} align="stretch" flex="1">
              <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                {card.name || 'Unknown Card'}
              </Text>
              <Tag
                size="sm"
                {...tagStyles}
                fontWeight="bold"
                fontSize="xs"
                px={2}
                py={0.5}
                lineHeight="1.1"
                borderRadius="md"
                alignSelf="flex-start"
                maxW="100%"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {card.card_code || 'N/A'}
              </Tag>
            </VStack>

            {/* Right side - Count spanning both lines (Collection mode shows counts) */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              minW="fit-content"
            >
              <Text
                fontSize="lg"
                fontWeight="bold"
                color="white"
                textAlign="center"
                lineHeight="1"
              >
                {countDisplay}
              </Text>
            </Box>
          </HStack>
        </Box>
      </Box>
    );
  };

  return (
    <Grid templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`} gap={3}>
      {cards.map((card) => (
        card ? <ThumbnailCard key={`${card.id}-${card.card_code}`} card={card} /> : null
      ))}
    </Grid>
  );
};

export default ThumbViewCollect;
