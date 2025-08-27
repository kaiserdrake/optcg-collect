'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Text, VStack, HStack, Tag, Spinner, Stat, StatLabel, StatNumber, Wrap, WrapItem, Image,
  Flex, Heading, StackDivider, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, Button, IconButton, Code, FormControl, FormLabel, Switch,
  Grid, GridItem, Tooltip, Slider, SliderTrack, SliderFilledTrack, SliderThumb
} from '@chakra-ui/react';
import { QuestionOutlineIcon, ViewIcon, HamburgerIcon } from '@chakra-ui/icons';
import AdvancedSearchInput from './AdvancedSearchInput';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';

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

const keywordStyles = {
  'trigger': { bg: 'yellow.400', color: 'black', variant: 'solid', px: '3', borderRadius: 0, sx: { clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 0% 100%)' } },
  'on play': { colorScheme: 'blue', variant: 'solid' },
  'activate: main': { colorScheme: 'blue', variant: 'solid' },
  'your turn': { colorScheme: 'blue', variant: 'solid' },
  'end of your turn': { colorScheme: 'blue', variant: 'solid' },
  'main': { colorScheme: 'blue', variant: 'solid' },
  'when attacking': { colorScheme: 'blue', variant: 'solid' },
  'when blocking': { colorScheme: 'blue', variant: 'solid' },
  'on k.o.': { colorScheme: 'blue', variant: 'solid' },
  "opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  "end of your opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  'counter': { colorScheme: 'red', variant: 'solid' },
  'once per turn': { colorScheme: 'pink', variant: 'solid', borderRadius: 'full' },
  'blocker': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'rush': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'double attack': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'banish': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
};

const keywordPatterns = [
    { regex: /DON!! [x-]\d+/i, style: { bg: 'black', color: 'white', variant: 'solid' } }
];

const StyledTextRenderer = ({ text }) => {
    if (!text || text.trim() === '' || text.trim() === '-') {
        return <Text as="span">&nbsp;</Text>;
    }
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((part, index) => {
        if (part.match(/^\[.*\]$/)) {
            const keyword = part.slice(1, -1).toLowerCase();
            const style = keywordStyles[keyword];
            if (style) {
                return <Tag key={index} {...style} mr={1}>{part.slice(1, -1)}</Tag>;
            }
            const patternMatch = keywordPatterns.find(p => p.regex.test(part.slice(1, -1)));
            if (patternMatch) {
                return <Tag key={index} {...patternMatch.style} mr={1}>{part.slice(1, -1)}</Tag>;
            }
        }
        return <Text key={index} as="span">{part}</Text>;
    });
};

const extractStyledKeywords = (effect, triggerEffect) => {
    const combinedText = `${effect || ''} ${triggerEffect || ''}`;
    const regex = /\[([^\]]+)\]/g;
    const keywordSet = new Set();
    let match;
    while ((match = regex.exec(combinedText)) !== null) {
        const keyword = match[1];
        const keywordLower = keyword.toLowerCase();
        const isExactMatch = !!keywordStyles[keywordLower];
        const isPatternMatch = keywordPatterns.some(p => p.regex.test(keyword));
        if (isExactMatch || isPatternMatch) {
            keywordSet.add(keyword);
        }
    }
    return Array.from(keywordSet);
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
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(currentCard => ({ ...currentCard, ...newCounts }));
    }
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

  useEffect(() => {
    // Extract if advanced search keywords are present (updated to include exact:)
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
              throw new Error(errData.message || `Search failed with status ${res.status}`);
            }
          }).catch(jsonError => {
            // If response is not JSON, create a generic error
            throw new Error(`Search failed: ${res.statusText || 'Unknown error'}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.warn('Search API returned non-array data:', data);
          setResults([]);
        } else {
          setResults(data);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch search results:", error);
        // Provide user-friendly error messages
        let errorMessage = 'Failed to fetch search results.';

        if (error.message.includes('could not determine data type')) {
          errorMessage = 'Search query contains invalid characters. Please try different search terms.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        setResults([]);
      })
      .finally(() => { setLoading(false); });
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, apiUrl, showOnlyOwned, showProxies]);

    // --- Subtle Status Message Styles ---
  const subtleBoxStyle = (color, borderColor) => ({
    mb: 4,
    p: 3,
    bg: color,
    borderRadius: 'md',
    borderLeft: '4px',
    borderColor: borderColor,
  });
  const subtleTextStyle = (color = 'gray.600', fontSize = 'sm') => ({
    color: color,
    fontSize: fontSize,
    fontWeight: 'normal',
    lineHeight: '1.5',
  });

  // Thumbnail Card Component
  const ThumbnailCard = ({ card }) => {
    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);
    const imageHeight = Math.floor(thumbnailSize * 1.4); // maintain aspect ratio

    return (
      <Box
        position="relative"
        cursor="pointer"
        onClick={() => handleCardClick(card)}
        _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
        transition="all 0.2s"
        bg="white"
        borderRadius="lg"
        shadow="md"
        overflow="hidden"
        w={`${thumbnailSize}px`}
        h="auto"
      >
        {/* Card Image */}
        <Box position="relative" w="100%" h={`${imageHeight}px`}>
          <Image
            src={card.img_url}
            alt={card.name}
            fallbackSrc={`https://via.placeholder.com/${thumbnailSize}x${imageHeight}?text=No+Image`}
            w="100%"
            h="100%"
            objectFit="cover"
          />
        </Box>

        {/* Card Info Overlay */}
        <Box p={3} bg="white">
          <Text fontSize="sm" fontWeight="bold" noOfLines={2} mb={2} textAlign="center">
            {card.name}
          </Text>

          {/* Count Information - Subtle */}
          <Flex justify="center" align="center" gap={4}>
            <VStack spacing={0}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                Owned
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="blue.600">
                {card.owned_count || 0}
              </Text>
            </VStack>

            {showProxies && (
              <VStack spacing={0}>
                <Text fontSize="xs" color="gray.400" fontWeight="medium">
                  Proxy
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="gray.500">
                  {card.proxy_count || 0}
                </Text>
              </VStack>
            )}
          </Flex>
        </Box>
      </Box>
    );
  };

  // List Card Component (existing implementation)
  const ListCard = ({ card }) => {
    const keywords = extractStyledKeywords(card.effect, card.trigger_effect);

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
              {card.attributes && card.attributes.length > 0 && card.attributes.map(attr => (<WrapItem key={attr}><Tag size="sm" variant="outline" colorScheme="gray">{toTitleCase(attr)}</Tag></WrapItem>))}
              {card.cost !== null && <WrapItem fontSize="sm">Cost: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.cost}</Text></WrapItem>}
              {card.power !== null && <WrapItem fontSize="sm">Power: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.power}</Text></WrapItem>}
              {card.counter !== null && <WrapItem fontSize="sm">Counter: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.counter}</Text></WrapItem>}
            </Wrap>
            <Wrap spacingX={4} spacingY={1} align="center">
              <WrapItem><Tag size="sm" {...getTagStyles(card.color)}>{card.card_code}</Tag></WrapItem>
              {card.rarity && <WrapItem fontSize="sm" color="gray.800" fontWeight="semibold">{card.rarity}</WrapItem>}
              {card.types && card.types.length > 0 && card.types.map(type => (<WrapItem key={type}><Tag size="sm" variant="outline">{toTitleCase(type)}</Tag></WrapItem>))}
            </Wrap>
            {keywords.length > 0 ? (
              <Wrap align="center" pt={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mr={2}>Keywords:</Text>
                {keywords.map(kw => (
                    <WrapItem key={kw}><Tag size="sm" variant="subtle" colorScheme="gray">{kw}</Tag></WrapItem>
                ))}
              </Wrap>
            ) : ( <Box h="22px" /> )}
          </VStack>
          <HStack spacing={4} ml={4}>
            {showProxies && (<VStack spacing={0}><Text fontSize="xs" color="gray.500">Proxy</Text><CountControl cardId={card.id} type="proxy" count={card.proxy_count} onUpdate={handleCountUpdate} /></VStack>)}
            <VStack spacing={0}><Text fontSize="xs" color="gray.500">Owned</Text><CountControl cardId={card.id} type="owned" count={card.owned_count} onUpdate={handleCountUpdate} /></VStack>
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
            <VStack align="start" spacing={1} flex={1}>
              <Text {...subtleTextStyle('yellow.700')}>
                No cards found for "{searchTerm}"
              </Text>
              <Text {...subtleTextStyle('yellow.600', 'xs')}>
                Try different keywords or remove filters
              </Text>
            </VStack>
            <HStack spacing={1}>
              <Button
                size="xs"
                colorScheme="yellow"
                variant="outline"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </Button>
              <Button
                size="xs"
                colorScheme="blue"
                variant="ghost"
                onClick={onHelpOpen}
              >
                Tips
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Results Counter */}
      {!loading && !error && results.length > 0 && (
        <Box {...subtleBoxStyle('gray.50', 'gray.200')}>
          <HStack justify="space-between" align="center">
            <Text {...subtleTextStyle('gray.500')}>
              Found {results.length} card{results.length !== 1 ? 's' : ''} for "{searchTerm}"
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

      {/* Card Detail Modal - Same as original */}
      {selectedCard && (
        <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="4xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
                <HStack>
                    <Text>{selectedCard.name}</Text>
                    <CardVariantIndicator cardId={selectedCard.id} />
                </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
                <Box flexShrink={0}>
                  <Image borderRadius="lg" width={{ base: '100%', md: '250px' }} src={selectedCard.img_url} alt={selectedCard.name} fallbackSrc='https://via.placeholder.com/250x350?text=No+Image' />
                </Box>
                <VStack align="stretch" spacing={3} flex={1}>
                  <Wrap spacing={2}>
                    <WrapItem><Tag size="lg" {...getTagStyles(selectedCard.color)}>{selectedCard.card_code}</Tag></WrapItem>
                    <WrapItem><Tag size="lg" colorScheme="gray">{selectedCard.category}</Tag></WrapItem>
                    <WrapItem><Tag size="lg" colorScheme="gray">{selectedCard.rarity}</Tag></WrapItem>
                  </Wrap>
                  <HStack spacing={6} divider={<StackDivider />} pt={1}>
                    {selectedCard.cost !== null && <Stat><StatLabel>Cost</StatLabel><StatNumber>{selectedCard.cost}</StatNumber></Stat>}
                    {selectedCard.power !== null && <Stat><StatLabel>Power</StatLabel><StatNumber>{selectedCard.power}</StatNumber></Stat>}
                    {selectedCard.counter !== null && <Stat><StatLabel>Counter</StatLabel><StatNumber>{selectedCard.counter}</StatNumber></Stat>}
                  </HStack>
                  <VStack spacing={4} align="stretch" pt={2}>
                    <StyledTextRenderer text={selectedCard.effect} />
                    <StyledTextRenderer text={selectedCard.trigger_effect} />
                  </VStack>
                   <Box pt={2}>
                    <Heading size="sm" mb={1}>Appears In</Heading>
                    <Wrap>
                      {selectedCard.packs?.split(', ').map(pack => (
                        <WrapItem key={pack}><Tag size="sm">{pack}</Tag></WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                  <HStack justify="flex-start" pt={3} borderTopWidth="1px" borderColor="gray.200" spacing={10}>
                      <VStack spacing={0}><Text fontSize="sm" fontWeight="bold" color="gray.500">Owned</Text><CountControl cardId={selectedCard.id} type="owned" count={selectedCard.owned_count} onUpdate={handleCountUpdate} /></VStack>
                      {showProxies && (<VStack spacing={0}><Text fontSize="sm" fontWeight="bold" color="gray.500">Proxy</Text><CountControl cardId={selectedCard.id} type="proxy" count={selectedCard.proxy_count} onUpdate={handleCountUpdate} /></VStack>)}
                  </HStack>
                </VStack>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={onDetailClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      <Modal isOpen={isHelpOpen} onClose={onHelpClose} isCentered>
        <ModalOverlay />
          <ModalContent>
             <ModalHeader>Advanced Search Syntax</ModalHeader>
               <ModalBody>
                 <VStack spacing={4} align="stretch">
                   <Text>You can combine general text with special keywords to narrow down your search.</Text>
                     <Box>
                       <Heading size="sm">Keywords</Heading>
                       <Text>Use <Code>id:</Code> to search for cards by their ID or code prefix.</Text>
                       <Text>Use <Code>pack:</Code> to filter for cards within a specific pack.</Text>
                       <Text>Use <Code>color:</Code> to filter by card color.</Text>
                       <Text>Use <Code>exact:"term"</Code> to search for exact word matches.</Text>
                     </Box>
                     <Box>
                       <Heading size="sm">Examples</Heading>
                       <VStack align="stretch" mt={2}>
                         <Text><Code>roronoa zoro</Code> - Fuzzy search for card text.</Text>
                         <Text><Code>exact:"Roronoa Zoro"</Code> - Exact match for "Roronoa Zoro".</Text>
                         <Text><Code>exact:"DON!!" exact:"Rush"</Code> - Cards with both "DON!!" and "Rush".</Text>
                         <Text><Code>id:ST01-001</Code> - Finds cards with an ID starting with "ST01-001".</Text>
                         <Text><Code>pack:OP01</Code> - Shows only cards from packs starting with "OP01".</Text>
                         <Text><Code>color:red</Code> - Shows only red cards.</Text>
                         <Text><Code>zoro exact:"Leader" color:green</Code> - Combined search.</Text>
                       </VStack>
                     </Box>
                   </VStack>
                 </ModalBody>
               <ModalFooter>
             <Button colorScheme="blue" onClick={onHelpClose}>Got it!</Button>
             </ModalFooter>
          </ModalContent>
      </Modal>
    </Box>
  );
}
