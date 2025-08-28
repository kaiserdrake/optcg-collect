'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';

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
      // Only include keywords that match keywordStyles or keywordPatterns
      // Ignore card names and other bracketed text
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

// Utility function to safely provide an image URL or fallback to local image
const getSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    // Use local fallback if img_url is null, empty, or not a valid http(s) url
    return '/placeholder.png';
  }
  return url;
};

export default function CardSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProxies, setShowProxies] = useState(false);
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'thumbnail'
  const [thumbnailSize, setThumbnailSize] = useState(160); // thumbnail size in pixels, default small
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    // Also update the selected card if it's the same card
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(current => ({ ...current, ...newCounts }));
    }
  };

  // Search functionality
  useEffect(() => {
    // Extract if advanced search keywords are present - now includes exact:
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
            // Handle specific error cases
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
  }, [searchTerm, showOnlyOwned, showProxies, apiUrl]);

  // Thumbnail Card Component (updated as per request)
  const ThumbnailCard = ({ card }) => {
    const nameMaxLength = 20;
    let displayName = card.name;
    if (displayName && displayName.length > nameMaxLength) {
      displayName = displayName.slice(0, nameMaxLength - 1) + '…';
    }

    let countDisplay = `${card.owned_count}`;
    if (showProxies) {
      countDisplay += ` : ${card.proxy_count}`;
    }

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
      >
        <Image
          width={`${thumbnailSize}px`}
          height={`${Math.floor(thumbnailSize * 1.4)}px`}
          src={getSafeImageUrl(card.img_url)}
          alt={card.name}
          fallbackSrc="/placeholder.png"
          objectFit="cover"
          ignoreFallback={false}
        />

        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          px={2}
          py={1}
          bg="rgba(0,0,0,0.58)"
          color="white"
          fontSize="xs"
          lineHeight="1.3"
          borderBottomRadius="md"
        >
          {/* First line: Card name (truncated with ellipsis if too long) */}
          <Text
            fontWeight="bold"
            fontSize="xs"
            noOfLines={1}
            title={card.name}
            mb="1px"
            textShadow="0 1px 2px rgba(0,0,0,0.7)"
          >
            {displayName}
          </Text>
          {/* Second line: Card code and counts */}
          <HStack spacing={2} fontSize="xs" justify="space-between">
            <Tag size="xs" {...getTagStyles(card.color)} fontWeight="semibold" px={2}>
              {card.card_code}
            </Tag>
            <Text fontSize="xs" fontWeight="bold" color="white" letterSpacing="wide" ml={1}>
              {countDisplay}
            </Text>
          </HStack>
        </Box>
      </Box>
    );
  };

  // List Card Component (unchanged)
  const ListCard = ({ card }) => {
    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);

    // Helper function to determine the cost label
    const getCostLabel = (card) => {
      return card.category === 'LEADER' ? 'Life' : 'Cost';
    };

    return (
      <Box
        key={card.id}
        p={3}
        shadow="sm"
        borderWidth="1px"
        borderRadius="md"
        onClick={() => handleCardClick(card)}
        cursor="pointer"
        _hover={{ shadow: 'md', bg: 'gray.50' }}
      >
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1.5} flex={1} minW={0}>
            <Wrap spacingX={4} spacingY={1} align="center">
              <WrapItem>
                <HStack>
                  <Text fontWeight="bold" fontSize="md" noOfLines={1}>{card.name}</Text>
                  <CardVariantIndicator cardId={card.id} />
                </HStack>
              </WrapItem>
              {card.category && <WrapItem fontSize="sm" color="gray.600">{toTitleCase(card.category)}</WrapItem>}
              {card.attributes && card.attributes.length > 0 && card.attributes.map(attr => (
                <WrapItem key={attr}>
                  <Tag size="sm" variant="outline" colorScheme="gray">{toTitleCase(attr)}</Tag>
                </WrapItem>
              ))}
              {card.cost !== null && <WrapItem fontSize="sm">{getCostLabel(card)}: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.cost}</Text></WrapItem>}
              {card.power !== null && <WrapItem fontSize="sm">Power: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.power}</Text></WrapItem>}
              {card.counter !== null && <WrapItem fontSize="sm">Counter: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.counter}</Text></WrapItem>}
            </Wrap>
            <Wrap spacingX={4} spacingY={1} align="center">
              <WrapItem><Tag size="sm" {...getTagStyles(card.color)}>{card.card_code}</Tag></WrapItem>
              {card.rarity && <WrapItem fontSize="sm" color="gray.800" fontWeight="semibold">{card.rarity}</WrapItem>}
              {card.types && card.types.length > 0 && card.types.map(type => (
                <WrapItem key={type}>
                  <Tag size="sm" variant="outline">{toTitleCase(type)}</Tag>
                </WrapItem>
              ))}
            </Wrap>
            {keywords.length > 0 ? (
              <Wrap align="center" pt={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mr={2}>Keywords:</Text>
                {keywords.map((kw, index) => (
                  <WrapItem key={index}>
                    <Tag size="sm" {...kw.style}>{kw.text}</Tag>
                  </WrapItem>
                ))}
              </Wrap>
            ) : (
                <Box h="22px" />
              )}
          </VStack>
          <HStack spacing={4} ml={4}>
            {showProxies && (
              <VStack spacing={0}>
                <Text fontSize="xs" color="gray.500">Proxy</Text>
                <CountControl cardId={card.id} type="proxy" count={card.proxy_count} onUpdate={handleCountUpdate} />
              </VStack>
            )}
            <VStack spacing={0}>
              <Text fontSize="xs" color="gray.500">Owned</Text>
              <CountControl cardId={card.id} type="owned" count={card.owned_count} onUpdate={handleCountUpdate} />
            </VStack>
          </HStack>
        </Flex>
      </Box>
    );
  };

  return (
    <Box>
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
        {/* View Toggle Buttons - Left Side */}
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

          {/* Thumbnail Size Slider - Only show when in thumbnail mode */}
          {viewMode === 'thumbnail' && (
            <HStack spacing={2} ml={4}>
              <Text fontSize="xs" color="gray.500">Size:</Text>
              <Box w="80px">
                <Slider
                  min={120}
                  max={250}
                  step={10}
                  value={thumbnailSize}
                  onChange={setThumbnailSize}
                  size="sm"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>
            </HStack>
          )}
        </HStack>

        {/* Controls - Right Side */}
        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="owned-only" mb="0" fontSize="sm">
              In Collection
            </FormLabel>
            <Switch id="owned-only" isChecked={showOnlyOwned} onChange={(e) => setShowOnlyOwned(e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="show-proxies" mb="0" fontSize="sm">
              Show Proxies
            </FormLabel>
            <Switch id="show-proxies" isChecked={showProxies} onChange={(e) => setShowProxies(e.target.checked)} />
          </FormControl>
        </HStack>
      </HStack>

      {loading && (
        <Box {...subtleBoxStyle('blue.50', 'blue.100')}>
          <HStack justify="space-between" align="center">
            <HStack>
              <Spinner size="sm" color="blue.500" />
              <Text {...subtleTextStyle('blue.700')}>
                Searching for "{searchTerm}"...
              </Text>
            </HStack>
            <Button
              size="xs"
              colorScheme="blue"
              variant="ghost"
              onClick={onHelpOpen}
            >
              Help
            </Button>
          </HStack>
        </Box>
      )}

      {/* No Results State */}
      {!loading && !error && searchTerm.length >= 3 && results.length === 0 && (
        <Box {...subtleBoxStyle('yellow.50', 'yellow.100')}>
          <HStack justify="space-between" align="center">
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

      {/* Results Summary */}
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
        <Suspense fallback={
          <Box w="100%" py={8} textAlign="center">
            <Spinner size="xl" color="blue.500" />
            <Text mt={2}>Loading cards...</Text>
          </Box>
        }>
          <Grid
            templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`}
            gap={6}
            justifyItems="center"
          >
            {results.map((card) => (
              <ThumbnailCard key={card.id} card={card} />
            ))}
          </Grid>
        </Suspense>
      )}

      {/* Modals */}
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
    </Box>
  );
}

