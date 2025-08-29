// components/CardSearch.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Text, VStack, HStack, Tag, Spinner, Wrap, WrapItem, Image,
  Flex, useDisclosure, Button, IconButton, FormControl, FormLabel, Switch,
  Grid, Tooltip, Slider, SliderTrack, SliderFilledTrack, SliderThumb
} from '@chakra-ui/react';
import { QuestionOutlineIcon, ViewIcon, HamburgerIcon } from '@chakra-ui/icons';
import AdvancedSearchInput from './AdvancedSearchInput';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import CardDetailModal from './CardDetailModal';
import SearchHelpModal from './SearchHelpModal';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';
import { getSafeImageUrl } from '@/utils/imageUtils';

const colorMap = {
  Red: '#E53E3E',
  Green: '#48BB78',
  Blue: '#4299E1',
  Purple: '#9F7AEA',
  Black: '#1A202C',
  Yellow: '#D69E2E',
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getTagStyles = (colorString) => {
  if (!colorString) return { variant: 'subtle' };
  const colors = colorString.split('/').map(c => colorMap[c.trim()]).filter(Boolean);
  if (colors.length === 0) return { variant: 'subtle' };
  if (colors.length === 1) {
    return { bg: colors[0], color: 'white', variant: 'solid' };
  }
  const gradient = `linear(to-r, ${colors.join(', ')})`;
  return { bgGradient: gradient, color: 'white', variant: 'solid' };
};

// Enhanced function to extract keywords with their styling
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

// Style helpers
const subtleBoxStyle = (bgColor, borderColor) => ({
  p: 3,
  bg: bgColor,
  borderWidth: '1px',
  borderColor: borderColor,
  borderRadius: 'md',
  mb: 4
});

const subtleTextStyle = (color) => ({
  fontSize: 'sm',
  color: color
});

export default function CardSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProxies, setShowProxies] = useState(false);
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [thumbnailSize, setThumbnailSize] = useState(160);
  const [isClient, setIsClient] = useState(false);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fix hydration issues by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCardClick = (card) => {
    setSelectedCard(card);
    onDetailOpen();
  };

  const handleCountUpdate = (cardId, newCounts) => {
    setResults(currentResults =>
      currentResults.map(card =>
        card.id === cardId ? { ...card, ...newCounts } : card
      )
    );
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(current => ({ ...current, ...newCounts }));
    }
  };

  // Search functionality
  useEffect(() => {
    if (!isClient) return;

    const advancedKeywordRegex = /(?:\b(id|pack|color|exact):\S+)/gi;
    const hasAdvancedKeyword = advancedKeywordRegex.test(searchTerm);

    if (searchTerm.length < 3 && !hasAdvancedKeyword) {
       setResults([]);
       setError(null);
       return;
    }

    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams({
          keyword: searchTerm,
          ownedOnly: showOnlyOwned,
          showProxies: showProxies,
      });
      fetch(`${apiUrl}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include'
      })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(errData => {
            if (res.status === 400) {
              throw new Error('Invalid search parameters. Please check your search criteria.');
            } else if (res.status === 500) {
              throw new Error('Server error occurred. Please try again later.');
            } else {
              throw new Error(errData.error || 'An unexpected error occurred.');
            }
          });
        }
        return res.json();
      })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, showOnlyOwned, showProxies, apiUrl, isClient]);

  // Improved Thumbnail Card Component
  const ThumbnailCard = ({ card }) => {
    const countDisplay = showProxies ? `${card.owned_count} : ${card.proxy_count}` : `${card.owned_count}`;
    const tagStyles = getTagStyles(card.color);

    return (
      <Box
        borderRadius="md"
        overflow="hidden"
        cursor="pointer"
        onClick={() => handleCardClick(card)}
        _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
        transition="all 0.2s"
        bg="white"
        shadow="md"
        position="relative"
        suppressHydrationWarning={true}
      >
        <CardImage
          width={`${thumbnailSize}px`}
          height={`${Math.floor(thumbnailSize * 1.4)}px`}
          src={card.img_url}
          alt={card.name}
          fallbackSrc="/placeholder.png"
          objectFit="cover"
          loading="lazy"
        />

        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          bg="rgba(0,0,0,0.7)"
          color="white"
          pt={2}
          pb={2}
          px={2}
        >
          <VStack spacing={1} align="stretch">
            <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
              {card.name}
            </Text>
            <HStack justify="space-between" align="center">
              <Tag
                size="sm"
                {...tagStyles}
                fontWeight="bold"
                fontSize="xs"
                px={2}
                py={0.5}
                lineHeight="1.1"
                borderRadius="md"
                maxW="80%"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {card.card_code}
              </Tag>
              <Text fontSize="m" fontWeight="bold" color="blue.300" ml={2} minW="36px" textAlign="right">
                {countDisplay}
              </Text>
            </HStack>
          </VStack>
        </Box>
      </Box>
    );
  };

  // List Card Component - FIXED VERSION
  const ListCard = ({ card }) => {
    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);

    const getCostLabel = (card) => {
      return card.category === 'LEADER' ? 'Life' : 'Cost';
    };

    const cleanEffectText = (text) => {
      if (!text || text.trim() === '' || text.trim() === '-') return '';
      return text.replace(/<[^>]*>/g, '').trim();
    };

    const effectDisplay = cleanEffectText(card.effect);
    const triggerDisplay = cleanEffectText(card.trigger_effect);

    return (
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={2}
        bg="white"
        _hover={{ shadow: 'md', borderColor: 'blue.300' }}
        cursor="pointer"
        onClick={() => handleCardClick(card)}
        transition="all 0.2s"
      >
        <Flex align="center" gap={2}>
          <CardImage
            width="80px"
            height="112px"
            src={card.img_url}
            alt={card.name}
            fallbackSrc="/placeholder.png"
            borderRadius="md"
            objectFit="cover"
            loading="lazy"
            flexShrink={0}
          />

          <VStack align="start" spacing={1} flex={1} h="100%" justify="center" minH="90px">
            <HStack wrap="wrap" spacing={1}>
              <Tag size="sm" {...getTagStyles(card.color)}>
                {card.card_code}
              </Tag>
              <Tag size="sm" colorScheme="gray" variant="outline">
                {card.category}
              </Tag>
              <Tag size="sm" colorScheme="purple" variant="outline">
                {card.rarity}
              </Tag>
              {card.cost !== null && (
                <Tag size="sm" colorScheme="orange" variant="outline">
                  {getCostLabel(card)}: {card.cost}
                </Tag>
              )}
              {card.power && (
                <Tag size="sm" colorScheme="red" variant="outline">
                  Power: {card.power.toLocaleString()}
                </Tag>
              )}
              {card.counter && (
                <Tag size="sm" colorScheme="yellow" variant="outline">
                  Counter: +{card.counter}
                </Tag>
              )}
              <CardVariantIndicator cardId={card.id} />
            </HStack>

            <Text fontSize="md" fontWeight="bold" color="gray.800" noOfLines={1}>
              {card.name}
            </Text>

            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {effectDisplay === '' ? '\u00A0' : effectDisplay}
            </Text>
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {triggerDisplay === '' ? '\u00A0' : triggerDisplay}
            </Text>

            {keywords.length > 0 && (
              <Wrap align="center" pt={1}>
                <Text fontSize="xs" color="gray.500" mr={2}>Keywords:</Text>
                {keywords.map((kw, index) => (
                  <WrapItem key={index}>
                    <Tag size="sm" {...kw.style}>{kw.text}</Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </VStack>

          {/* FIXED: Count Control Section */}
          <HStack spacing={2} ml={2} align="center">
            {showProxies && (
              <VStack spacing={0}>
                <Text fontSize="xs" color="gray.500">Proxy</Text>
                <CountControl
                  cardId={card.id}
                  type="proxy"
                  count={card.proxy_count || 0}
                  onUpdate={handleCountUpdate}
                />
              </VStack>
            )}
            <VStack spacing={0}>
              <Text fontSize="xs" color="gray.500">Owned</Text>
              <CountControl
                cardId={card.id}
                type="owned"
                count={card.owned_count || 0}
                onUpdate={handleCountUpdate}
              />
            </VStack>
          </HStack>
        </Flex>
      </Box>
    );
  };

  // Don't render until client-side to prevent hydration mismatch
  if (!isClient) {
    return (
      <Box>
        <VStack spacing={4} align="center" py={8}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.500">Loading card search...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box suppressHydrationWarning={true}>
      <HStack mb={4}>
        <AdvancedSearchInput
          placeholder="Search cards by name, effect, or use advanced syntax..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="filled"
          size="md"
        />
        <Button
          leftIcon={<QuestionOutlineIcon />}
          onClick={onHelpOpen}
          variant="outline"
          colorScheme="blue"
          size="md"
        >
          Help
        </Button>
      </HStack>

      {/* Filters and View Toggle */}
      <HStack mb={4} justify="space-between" wrap="wrap" spacing={4}>
        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.600">View:</Text>
          <Tooltip label="List View">
            <IconButton
              aria-label="List View"
              icon={<HamburgerIcon />}
              size="sm"
              variant={viewMode === 'list' ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setViewMode('list')}
            />
          </Tooltip>
          <Tooltip label="Thumbnail View">
            <IconButton
              aria-label="Thumbnail View"
              icon={<ViewIcon />}
              size="sm"
              variant={viewMode === 'thumbnail' ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setViewMode('thumbnail')}
            />
          </Tooltip>
        </HStack>

        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="owned-only" mb="0" fontSize="sm">
              Owned Only
            </FormLabel>
            <Switch
              id="owned-only"
              isChecked={showOnlyOwned}
              onChange={(e) => setShowOnlyOwned(e.target.checked)}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="show-proxies" mb="0" fontSize="sm">
              Show Proxies
            </FormLabel>
            <Switch
              id="show-proxies"
              isChecked={showProxies}
              onChange={(e) => setShowProxies(e.target.checked)}
            />
          </FormControl>
        </HStack>
      </HStack>

      {/* Thumbnail Size Slider (only show in thumbnail mode) */}
      {viewMode === 'thumbnail' && (
        <Box mb={4}>
          <Text fontSize="sm" color="gray.600" mb={2}>Thumbnail Size:</Text>
          <Slider
            value={thumbnailSize}
            onChange={(value) => setThumbnailSize(value)}
            min={120}
            max={250}
            step={10}
            width="200px"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={4} color="gray.500">Searching cards...</Text>
        </Box>
      )}

      {!loading && searchTerm.length >= 3 && results.length === 0 && !error && (
        <Box {...subtleBoxStyle('yellow.50', 'yellow.100')}>
          <HStack>
            <Text {...subtleTextStyle('yellow.700')}>
              No cards found for "{searchTerm}". Try adjusting your search terms.
            </Text>
            <Button
              size="xs"
              colorScheme="yellow"
              variant="ghost"
              onClick={onHelpOpen}
            >
              Search Help
            </Button>
          </HStack>
        </Box>
      )}

      {!loading && results.length > 0 && (
        <Box {...subtleBoxStyle('green.50', 'green.100')}>
          <HStack justify="space-between" align="center">
            <Text {...subtleTextStyle('green.700')}>
              Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchTerm}"
            </Text>
            <Text fontSize="xs" color="gray.500">
              Viewing as: {viewMode === 'list' ? 'List' : 'Thumbnails'}
            </Text>
          </HStack>
        </Box>
      )}

      {error && <Text color="red.500">Error: {error}</Text>}

      {/* Results Display */}
      {viewMode === 'list' ? (
        <VStack spacing={2} align="stretch">
          {results.map((card) => (
            <ListCard key={card.id} card={card} />
          ))}
        </VStack>
      ) : (
        <Grid
          templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`}
          gap={6}
          justifyItems="center"
        >
          {results.map((card) => (
            <ThumbnailCard key={card.id} card={card} />
          ))}
        </Grid>
      )}

      {/* Modals */}
      {isClient && (
        <>
          <CardDetailModal
            isOpen={isDetailOpen}
            onClose={onDetailClose}
            selectedCard={selectedCard}
            showProxies={showProxies}
            onCountUpdate={handleCountUpdate}
          />

          <SearchHelpModal
            isOpen={isHelpOpen}
            onClose={onHelpClose}
          />
        </>
      )}
    </Box>
  );
}
