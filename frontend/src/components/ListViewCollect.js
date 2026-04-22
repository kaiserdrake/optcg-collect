'use client';

import React from 'react';
import {
  Box, Text, VStack, HStack, Tag, Flex, useBreakpointValue
} from '@chakra-ui/react';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import CardTags from './CardTags';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';
import LocationDisplayBadge from './LocationDisplayBadge';
import { FiMapPin } from 'react-icons/fi';
import { getTagStyles, stripHtml } from '@/utils/cardStyles';
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';

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

const ListViewCollect = ({ cards, onCardClick, showProxies, onCountUpdate, onLocationBadgeClick }) => {
  // Check if we should use mobile layout
  const isMobile = useBreakpointValue({ base: true, md: false });

  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  const handleLocationClick = (e, card) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) {
      e.stopImmediatePropagation();
    }
    if (onLocationBadgeClick && card) {
      onLocationBadgeClick(card);
    }
  };

  const ListCard = ({ card }) => {
    if (!card) return null;

    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);
    const effectDisplay = stripHtml(card.effect || '');
    const triggerDisplay = stripHtml(card.trigger_effect || '');

    // Determine if there are tags or a location to display
    const hasTags = !!(card && card.id);
    const hasLocation = (card && ((card.owned_count || 0) > 0 || (card.proxy_count || 0) > 0));

    if (isMobile) {
      // Mobile layout: Hide Effect, Trigger, Keywords and move Count Controls to own row
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
          <VStack spacing={3} align="stretch">
            {/* First Row: Card Image and Basic Info */}
            <Flex>
              {/* Card Image - 20% of width */}
              <Box flexShrink={0} mr={3} width="20%">
                <CardImage
                  width="100%"
                  height="auto"
                  src={card.img_url || ''}
                  alt={card.name || 'Card'}
                  fallbackSrc="/placeholder.png"
                  objectFit="cover"
                  borderRadius="md"
                  loading="lazy"
                  style={{ aspectRatio: '5/7' }}
                />
              </Box>

              {/* Card Info - Reorganized layout */}
              <VStack align="start" spacing={1} flex={1} justify="start">
                {/* Row 1: Card Code | Variation Icon | Rarity | Tags */}
                <HStack justify="space-between" width="100%" align="center">
                  <HStack spacing={2}>
                    <Tag size="sm" {...getTagStyles(card.color)}>
                      {card.card_code}
                    </Tag>
                    <CardVariantIndicator cardId={card.id} />
                    <Text fontSize="xs" color="gray.400">
                      {card.rarity}
                    </Text>
                  </HStack>
                  {hasTags && (
                    <CardTags card={card} interactive={false} size="sm" showTooltips={true} />
                  )}
                </HStack>

                {/* Row 2: Name */}
                <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1} width="100%">
                  {card.name}
                </Text>

                {/* Row 3: Category | Cost | Power */}
                <HStack spacing={2} width="100%">
                  <Text fontSize="xs" color="gray.600">
                    {card.category}
                  </Text>
                  {card.cost !== null && (
                    <Text fontSize="xs" color="gray.600">
                      {getCostLabel(card)}: {card.cost}
                    </Text>
                  )}
                  {card.power && (
                    <Text fontSize="xs" color="gray.600">
                      Power: {card.power.toLocaleString()}
                    </Text>
                  )}
                  {card.counter && (
                    <Text fontSize="xs" color="gray.600">
                      Counter: +{card.counter}
                    </Text>
                  )}
                </HStack>

                {/* Row 4: Location */}
                <Box
                  width="100%"
                  onClick={(e) => handleLocationClick(e, card)}
                  cursor={hasLocation ? "pointer" : "default"}
                >
                  {hasLocation && (
                    <LocationDisplayBadge
                      card={card}
                      onClick={onLocationBadgeClick}
                    />
                  )}
                </Box>
              </VStack>
            </Flex>

            {/* Second Row: Count Controls */}
            <HStack spacing={4} justify="center" pt={2} borderTop="1px" borderColor="gray.100">
              <VStack spacing={1}>
                <Text fontSize="xs" color="gray.500">Owned</Text>
                <CountControl
                  cardId={card.id}
                  type="owned"
                  count={card.owned_count || 0}
                  onUpdate={onCountUpdate}
                />
              </VStack>
              {showProxies && (
                <VStack spacing={1}>
                  <Text fontSize="xs" color="gray.500">Proxy</Text>
                  <CountControl
                    cardId={card.id}
                    type="proxy"
                    count={card.proxy_count || 0}
                    onUpdate={onCountUpdate}
                  />
                </VStack>
              )}
            </HStack>
          </VStack>
        </Box>
      );
    } else {
      // Desktop layout: Keep existing layout with all fields
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
          {/* Top right - CardTags and LocationDisplay, cascaded */}
          {(hasTags || hasLocation) && (
            <HStack position="absolute" top={2} right={2} zIndex={2} spacing={2}>
              {hasLocation && (
                <Box onClick={(e) => handleLocationClick(e, card)}>
                  <LocationDisplayBadge
                    card={card}
                    onClick={onLocationBadgeClick}
                  />
                </Box>
              )}
              {hasTags && (
                <CardTags card={card} interactive={false} size="md" showTooltips={true} />
              )}
            </HStack>
          )}

          <Flex>
            {/* Card Image - Desktop: Original fixed size */}
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

              {/* Effect and Trigger Effect - Desktop shows full wrapped text with stylized keywords */}
              {effectDisplay && effectDisplay !== '' && (
                <Box
                  pt={1}
                  w="100%"
                  pl={3}
                  borderLeft="4px solid"
                  borderLeftColor="black.400"
                  borderRadius="md"
                  p={2}
                  fontSize="xs"
                >
                  <StyledTextRenderer text={card.effect || ''} keywordSize="xs" />
                </Box>
              )}
              {triggerDisplay && triggerDisplay !== '' && (
                <Box
                  pt={1}
                  w="100%"
                  pl={3}
                  borderLeft="4px solid"
                  borderLeftColor="orange.400"
                  borderRadius="md"
                  p={2}
                  fontSize="xs"
                >
                  <StyledTextRenderer text={card.trigger_effect || ''} keywordSize="xs" />
                </Box>
              )}

            </VStack>

            {/* Count Control Section - Horizontal layout on desktop */}
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
    }
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
