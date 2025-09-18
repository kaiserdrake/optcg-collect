'use client';

import React from 'react';
import {
  Box,
  Icon,
  HStack,
  IconButton
} from '@chakra-ui/react';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';
import { FaCrown } from 'react-icons/fa';
import { Bs1CircleFill, Bs2CircleFill, Bs3CircleFill, Bs4CircleFill } from 'react-icons/bs';

import CardImage from './CardImage';

const getCountBadgeIcon = (count) => {
  switch (count) {
    case 1: return Bs1CircleFill;
    case 2: return Bs2CircleFill;
    case 3: return Bs3CircleFill;
    case 4: return Bs4CircleFill;
    default: return null;
  }
};

const DeckCard = ({
  item,
  onRemove,
  onAddCard,
  onCardClick,
  isLeader = false,
  isViewOnly = false,
  thumbnailSize = 120
}) => {
  const card = item?.card || item;
  const count = item?.count || 1;

  if (!card) {
    console.error('DeckCard: No card data provided', item);
    return null;
  }

  // Calculate dimensions based on thumbnailSize (maintaining original aspect ratio)
  const cardWidth = thumbnailSize;
  const cardHeight = Math.floor(thumbnailSize * 1.338); // Original ratio: 174/130 = 1.338

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(card);
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(card);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (onAddCard) {
      onAddCard(card);
    }
  };

  return (
    <Box
      className="deck-card"
      position="relative"
      _hover={!isViewOnly ? {
        "& .control-buttons": { opacity: 1 },
        transform: 'translateY(-2px)'
      } : {
        transform: 'translateY(-2px)'
      }}
      transition="all 0.2s"
    >
      {/* Card Image - dynamic sizing instead of hardcoded "130px" and "174px" */}
      <Box
        borderRadius="md"
        overflow="hidden"
        bg="white"
        shadow="sm"
        cursor="pointer"
        onClick={handleCardClick}
        width={`${cardWidth}px`}
        height={`${cardHeight}px`}
        position="relative"
      >
        <CardImage
          src={card.img_url || ''}
          alt={card.name || 'Card'}
          width={`${cardWidth}px`}
          height={`${cardHeight}px`}
          objectFit="cover"
        />

        {/* Leader crown */}
        {isLeader && (
          <Box
            position="absolute"
            top={1}
            left={1}
            bg="yellow.400"
            borderRadius="full"
            p={1}
            shadow="md"
          >
            <Icon as={FaCrown} color="yellow.800" boxSize={3} />
          </Box>
        )}

        {/* Count badge */}
        {!isLeader && (
          <Box position="absolute" top={1} right={1}>
            {count <= 4 ? (
              <Icon
                as={getCountBadgeIcon(count)}
                boxSize="30px"
                color="red.500"
                bg="white"
                borderRadius="full"
                border="1px solid white"
              />
            ) : (
              <Box
                bg="red.500"
                color="white"
                borderRadius="full"
                width="30px"
                height="30px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                boxShadow="md"
                border="1px solid white"
              >
                {count}
              </Box>
            )}
          </Box>
        )}
        {!isViewOnly && onRemove && onAddCard && (
          <HStack
            className="control-buttons"
            position="absolute"
            bottom={1}
            left="50%"
            transform="translateX(-50%)"
            spacing={1}
            opacity={0}
            transition="opacity 0.2s"
            bg="rgba(0, 0, 0, 0.8)"
            borderRadius="md"
            p={1}
          >
            <IconButton
              icon={<MinusIcon />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={handleRemoveClick}
              color="white"
              _hover={{ bg: 'red.600' }}
            />
            <IconButton
              icon={<AddIcon />}
              size="xs"
              variant="ghost"
              colorScheme="green"
              onClick={handleAddClick}
              color="white"
              _hover={{ bg: 'green.600' }}
            />
          </HStack>
        )}
      </Box>
    </Box>
  );
};

export default DeckCard;
