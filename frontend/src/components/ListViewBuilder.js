'use client';

import React from 'react';
import {
  Box, Text, VStack, HStack, Tag, Flex, IconButton, useDisclosure, Tooltip
} from '@chakra-ui/react';
import { RiFileSearchFill } from 'react-icons/ri';
import CardImage from './CardImage';
import CardVariantIndicator from './CardVariantIndicator';
import CardTags from './CardTags';
import CardDetailModal from './CardDetailModal';
import { getTagStyles } from '@/utils/cardStyles';
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';

// Extract keywords with styling for deck builder
const extractStyledKeywords = (effect, triggerEffect) => {
  const combinedText = `${effect || ''} ${triggerEffect || ''}`;
  const regex = /\[([^\]]+)\]/g;
  const keywordArray = [];
  let match;
  while ((match = regex.exec(combinedText)) !== null) {
    const keyword = match[1];
    const keywordLower = keyword.toLowerCase();
    const style = keywordStyles[keywordLower];

    if (style) {
      keywordArray.push({ text: keyword, style });
    } else {
      const patternMatch = keywordPatterns.find(p => p.regex.test(keyword));
      if (patternMatch) {
        keywordArray.push({ text: keyword, style: patternMatch.style });
      }
    }
  }
  return keywordArray;
};

const ListViewBuilder = ({ cards, onCardClick }) => {
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = React.useState(null);

  const handleDetailClick = (card) => {
    setSelectedCard(card);
    onDetailOpen();
  };

  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  const ListCard = ({ card }) => {
    if (!card) return null;

    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);

    // Determine if there are tags to display
    const hasTags = !!(card && card.id);

    return (
      <Tooltip label="Click to add" placement="top" hasArrow>
        <Box
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          bg="white"
          p={3}
          cursor="pointer"
          onClick={() => onCardClick(card)}
          _hover={{ borderColor: 'blue.400', shadow: 'md', bg: 'blue.50' }}
          transition="all 0.2s"
          mb={2}
          suppressHydrationWarning={true}
          position="relative"
          role="group"
        >
          {/* Top right - CardTags (read-only), similar to ListViewCollect */}
          {hasTags && (
            <HStack position="absolute" top={2} right={2} zIndex={2} spacing={2}>
              <CardTags card={card} interactive={false} size="sm" showTooltips={true} />
            </HStack>
          )}

          {/* Detail Badge - only visible on hover */}
          <Box
            position="absolute"
            top="50%"
            right="12px"
            transform="translateY(-50%)"
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

          <Flex align="start">
            {/* Card Image - Only change: objectFit from cover to contain */}
            <Box flexShrink={0} mr={3}>
              <CardImage
                width="50"
                height="70"
                src={card.img_url || ''}
                alt={card.name || 'Card'}
                fallbackSrc="/placeholder.png"
                objectFit="contain"
                borderRadius="md"
                loading="lazy"
              />
            </Box>

            {/* Card Info - structured layout */}
            <VStack align="start" spacing={1} flex={1}>
              {/* Row 1: Card Name, Rarity, Variant Indicator */}
              <HStack justify="space-between" w="100%">
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1}>
                    {card.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {card.rarity}
                  </Text>
                  <CardVariantIndicator cardId={card.id} />
                </HStack>
              </HStack>

              {/* Row 2: Card Code (stylized tag), Category, Attributes, Cost, Power, Counter (text format) */}
              <HStack spacing={3} wrap="wrap" align="center">
                {/* Only Card Code remains as a stylized tag */}
                <Tag size="sm" {...getTagStyles(card.color)}>
                  {card.card_code}
                </Tag>

                {/* All other details converted to text */}
                <Text fontSize="xs" color="gray.600">
                  {card.category}
                </Text>

                {/* Attributes */}
                {card.attributes && card.attributes.length > 0 && (
                  <Text fontSize="xs" color="gray.600">
                    {card.attributes.join('/')}
                  </Text>
                )}

                {/* Cost */}
                {card.cost !== null && (
                  <Text fontSize="xs" color="gray.600">
                    {getCostLabel(card)}: {card.cost}
                  </Text>
                )}

                {/* Power */}
                {card.power && (
                  <Text fontSize="xs" color="gray.600">
                    Power: {card.power.toLocaleString()}
                  </Text>
                )}


                {/* Counter */}
                {card.counter && (
                  <Text fontSize="xs" color="gray.600">
                    Counter: +{card.counter}
                  </Text>
                )}
              </HStack>

              {/* Row 3: Stylized Keywords (keep as tags with original styling) */}
              {keywords.length > 0 && (
                <HStack spacing={1} wrap="wrap">
                  {keywords.map((kw, index) => (
                    <Tag size="sm" key={index} {...kw.style}>
                      {kw.text}
                    </Tag>
                  ))}
                </HStack>
              )}
            </VStack>
          </Flex>
        </Box>
      </Tooltip>
    );
  };

  return (
    <>
      <VStack spacing={2} align="stretch">
        {cards.map((card) => (
          card ? <ListCard key={`${card.id}-${card.card_code}`} card={card} /> : null

        ))}
      </VStack>

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

export default ListViewBuilder;
