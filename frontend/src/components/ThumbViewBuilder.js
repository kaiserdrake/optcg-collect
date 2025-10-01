'use client';

import React from 'react';
import {
  Box, Text, VStack, HStack, Tag, Grid, IconButton, useDisclosure, Tooltip
} from '@chakra-ui/react';
import { RiFileSearchFill } from 'react-icons/ri';
import CardImage from './CardImage';
import CardDetailModal from './CardDetailModal';
import { getTagStyles } from '@/utils/cardStyles';

const ThumbViewBuilder = ({ cards, onCardClick, thumbnailSize = 120 }) => {
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = React.useState(null);

  const handleDetailClick = (card) => {
    setSelectedCard(card);
    onDetailOpen();
  };

  const ThumbnailCard = ({ card }) => {
    if (!card) return null;

    const tagStyles = getTagStyles(card.color);

    // Calculate exact dimensions to ensure overlay matches image
    const cardWidth = thumbnailSize;
    const cardHeight = Math.floor(thumbnailSize * 1.4);

    return (
      <Tooltip label="Click to add" placement="top" hasArrow>
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
          role="group"
        >
          {/* Stack effect for multiple cards - create multiple card layers */}
          {/* Bottom layer (offset more) */}
          <Box
            position="absolute"
            top="4px"
            left="4px"
            width={`${cardWidth}px`}
            height={`${cardHeight}px`}
            bg="gray.300"
            borderRadius="md"
            zIndex={0}
          />

          {/* Middle layer (offset less) */}
          <Box
            position="absolute"
            top="2px"
            left="2px"
            width={`${cardWidth}px`}
            height={`${cardHeight}px`}
            bg="gray.400"
            borderRadius="md"
            zIndex={0}
          />

          {/* Main card image - full image, no cropping */}
          <Box
            position="relative"
            zIndex={1}
            bg="white"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
          >
            <CardImage
              width={`${cardWidth}px`}
              height={`${cardHeight}px`}
              src={card.img_url || ''}
              alt={card.name || 'Card'}
              fallbackSrc="/placeholder.png"
              objectFit="contain"
              loading="lazy"
            />

            {/* Detail Badge - only visible on hover */}
            <Box
              position="absolute"
              top="8px"
              right="8px"
              opacity={0}
              _groupHover={{ opacity: 1 }}
              transition="opacity 0.2s"
              zIndex={3}
            >
              <IconButton
                icon={<RiFileSearchFill />}
                size="sm"
                colorScheme="blue"
                variant="solid"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the card click
                  handleDetailClick(card);
                }}
                aria-label="View card details"
                borderRadius="full"
                shadow="md"
              />
            </Box>

            {/* Simplified card info overlay - only name and card code */}
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
              zIndex={2}
            >
              <VStack spacing={1} align="stretch">
                {/* First line: Card Name */}
                <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                  {card.name || 'Unknown Card'}
                </Text>

                {/* Second line: Stylized Card Code */}
                <Tag
                  size="xs"
                  {...tagStyles}
                  fontWeight="bold"
                  fontSize="xs"
                  px={1}
                  py={0.5}
                  lineHeight="1.1"
                  borderRadius="sm"
                  alignSelf="flex-start"
                  maxW="100%"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {card.card_code || 'N/A'}
                </Tag>
              </VStack>
            </Box>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  return (
    <>
      <Grid templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`} gap={3}>
        {cards.map((card) => (
          card ? <ThumbnailCard key={`${card.id}-${card.card_code}`} card={card} /> : null
        ))}
      </Grid>

      {/* CardDetailModal in interactive mode */}
      <CardDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        selectedCard={selectedCard}
        showProxies={true}
        interactive={true}
      />
    </>
  );
};

export default ThumbViewBuilder;
