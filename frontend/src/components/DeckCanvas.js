'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Grid,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import DeckCard from './DeckCard';

const DeckCanvas = ({ deck, stats, sortedCards, sortMode, sortReverse, setSortMode, setSortReverse, onCardClick, onRemoveCard, onAddCard }) => {

  // NORMALIZE CARD ITEM - Ensures consistent { card: {...}, count } structure
  const normalizeCardItem = React.useCallback((item) => {

    if (!item) return null;

    // If item already has the correct structure: { card: {...}, count }

    if (item.card && typeof item.card === 'object' && typeof item.count === 'number') {
      return {
        card: { ...item.card },
        count: item.count
      };
    }

    // If item is a flat card object with count: { id, name, category, ..., count }
    if (typeof item.count === 'number' && (item.id || item.card_code)) {
      const { count, ...cardData } = item;
      return {
        card: { ...cardData },
        count: count
      };
    }

    // If item is just a card object without count, default count to 1
    if (item.id || item.card_code) {
      return {
        card: { ...item },
        count: 1
      };
    }

    return null;

  }, []);

  return (
    <VStack spacing={4} align="stretch" h="100%">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="bold" color="gray.800">
            Deck Canvas
          </Text>
          <Text fontSize="sm" color="gray.600">
            {stats?.cardCount || 0} cards • {stats?.hasLeader ? 'Has leader' : 'No leader'}
          </Text>
        </VStack>
        <HStack spacing={2}>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">Sort:</Text>
            <Select
              size="sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              width="auto"
              minW="120px"
            >
              <option value="cost">Cost</option>
              <option value="name">Name</option>
              <option value="type">Type</option>
            </Select>

            <Tooltip label={sortReverse ? 'Sort ascending' : 'Sort descending'}>
              <IconButton
                icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                size="sm"
                variant="outline"
                onClick={() => setSortReverse(!sortReverse)}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </HStack>

      {/* Canvas Content */}
      <Box
        flex="1"
        bg="gray.50"
        borderRadius="md"
        p={2}
        border="2px dashed"
        borderColor="gray.300"
        overflowY="auto"
        maxH="600px"
      >
        {!deck?.cards || deck.cards.length === 0 ? (
          <VStack spacing={4} justify="center" h="200px">
            <Text color="gray.500" fontSize="lg">
              Your deck is empty
            </Text>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Search for cards on the right and click to add them to your deck
            </Text>
          </VStack>

        ) : (
          <Grid
            templateColumns="repeat(auto-fill, minmax(120px, 1fr))"
            gap={1}
            justifyItems="center"
            p={0}
          >
            {sortedCards && sortedCards.map((item, index) => {
              const normalizedItem = normalizeCardItem(item);
              if (!normalizedItem || !normalizedItem.card) {
                console.warn('Invalid card item in sortedCards:', item);
                return null;
              }

              return (
                <DeckCard
                  key={`${normalizedItem.card.id || 'unknown'}-${index}`}
                  item={normalizedItem}
                  onRemove={onRemoveCard}
                  onAddCard={onAddCard}
                  onCardClick={onCardClick}
                  isLeader={normalizedItem.card.category === 'LEADER'}
                />
              );
            })}
          </Grid>
        )}
      </Box>
    </VStack>
  );
};

export default DeckCanvas;
