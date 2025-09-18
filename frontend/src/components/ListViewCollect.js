'use client';

import React from 'react';
import {
  Box, Text, VStack, HStack, Tag, Flex
} from '@chakra-ui/react';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import CardTags from './CardTags';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';
import { FiMapPin } from 'react-icons/fi';
import { getTagStyles, stripHtml } from '@/utils/cardStyles';
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';

// Simple LocationDisplay component for Collection mode
const LocationDisplay = ({ card }) => {
  if (!card) return null;

  const owned = card.owned_count || 0;
  const proxy = card.proxy_count || 0;
  const hasCard = owned > 0 || proxy > 0;

  if (!hasCard) return null;

  const location = card.location;
  if (!location?.name) return null;

  const markerColor = location.marker || 'gray';
  const chakraColor = markerColor === 'gray' ? 'gray.500' : `${markerColor}.500`;

  return (
    <Tag size="sm" variant="subtle" bg="gray.100" color={chakraColor} border="none" boxShadow="none">
      <HStack spacing={1}>
        <FiMapPin color={chakraColor} />
        <Text fontSize="xs" color={chakraColor}>{location.name}</Text>
      </HStack>
    </Tag>
  );
};

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

const ListViewCollect = ({ cards, onCardClick, showProxies, onCountUpdate }) => {
  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  const ListCard = ({ card }) => {
    if (!card) return null;

    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);
    const effectDisplay = stripHtml(card.effect || '');
    const triggerDisplay = stripHtml(card.trigger_effect || '');

    // Determine if there are tags or a location to display
    const hasTags = !!(card && card.id);
    const hasLocation = (card && ((card.owned_count || 0) > 0 || (card.proxy_count || 0) > 0));

    return (
      <Box
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        bg="white"
        p={2}
        cursor="pointer"
        onClick={() => onCardClick(card)}
        _hover={{ borderColor: 'blue.400', shadow: 'md' }}
        transition="all 0.2s"
        mb={2}
        suppressHydrationWarning={true}
        position="relative"
      >
        {/* Top right - CardTags and LocationDisplay (read-only), cascaded */}
        {(hasTags || hasLocation) && (
          <HStack position="absolute" top={2} right={2} zIndex={2} spacing={2}>
            {hasLocation && (
              <LocationDisplay card={card} />
            )}
            {hasTags && (
              <CardTags card={card} interactive={false} size="sm" showTooltips={true} />
            )}
          </HStack>
        )}

        <Flex>
          {/* Card Image */}
          <Box flexShrink={0} mr={4}>
            <CardImage
              width="84"
              height="116"
              src={card.img_url || ''}
              alt={card.name || 'Card'}
              fallbackSrc="/placeholder.png"
              objectFit="cover"
              borderRadius="md"
              loading="lazy"
            />
          </Box>

          {/* Card Info */}
          <VStack align="start" spacing={1} flex={1} h="100%" justify="center" minH="90px">
            <HStack>
              <Text fontSize="md" fontWeight="bold" color="gray.800" noOfLines={1}>
                {card.name}
              </Text>
              <Text size="xs" color="gray.400">
                {card.rarity}
              </Text>
              <CardVariantIndicator cardId={card.id} />
            </HStack>

            <HStack wrap="wrap" spacing={1}>
              <Tag size="sm" {...getTagStyles(card.color)}>
                {card.card_code}
              </Tag>
              <Tag size="sm" colorScheme="gray" variant="outline">
                {card.category}
              </Tag>
              {card.cost !== null && (
                <Tag size="sm" colorScheme="gray" variant="outline">
                  {getCostLabel(card)}: {card.cost}
                </Tag>
              )}
              {card.power && (
                <Tag size="sm" colorScheme="gray" variant="outline">
                  Power: {card.power.toLocaleString()}
                </Tag>
              )}
              {card.counter && (
                <Tag size="sm" colorScheme="gray" variant="outline">
                  Counter: +{card.counter}
                </Tag>
              )}
            </HStack>

            {/* Effect and Trigger Effect - Collection mode shows full text */}
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {effectDisplay === '' ? '\u00A0' : effectDisplay}
            </Text>
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {triggerDisplay === '' ? '\u00A0' : triggerDisplay}
            </Text>

            {/* Keywords display */}
            <HStack pt={1} justify="flex-start" w="100%" align="center">
              <Text fontSize="sm" color="gray.500" mr={2}>Keywords:</Text>
              {keywords.map((kw, index) => (
                <Tag size="sm" key={index} {...kw.style}>{kw.text}</Tag>
              ))}
            </HStack>
          </VStack>

          {/* Count Control Section - Both controls appear horizontally if both are present */}
          <HStack spacing={2} ml={2} align="center">
            {showProxies && (
              <VStack spacing={0}>
                <Text fontSize="xs" color="gray.500">Proxy</Text>
                <CountControl
                  cardId={card.id}
                  type="proxy"
                  count={card.proxy_count || 0}
                  onUpdate={onCountUpdate}
                />
              </VStack>
            )}
            <VStack spacing={0}>
              <Text fontSize="xs" color="gray.500">Owned</Text>
              <CountControl
                cardId={card.id}
                type="owned"
                count={card.owned_count || 0}
                onUpdate={onCountUpdate}
              />
            </VStack>
          </HStack>
        </Flex>
      </Box>
    );
  };

  return (
    <VStack spacing={2} align="stretch">
      {cards.map((card) => (
        card ? <ListCard key={`${card.id}-${card.card_code}`} card={card} /> : null
      ))}
    </VStack>
  );
};

export default ListViewCollect;
