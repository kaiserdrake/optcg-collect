'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Text, VStack, HStack, Spinner, Button,
  useDisclosure, IconButton, FormControl, FormLabel, Switch,
  Tooltip, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Menu, MenuButton, MenuList, MenuItem, useBreakpointValue
} from '@chakra-ui/react';
import { QuestionOutlineIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FiMapPin, FiSearch, FiHash, FiType, FiTag } from 'react-icons/fi';
import { FaGripLines, FaGripHorizontal } from 'react-icons/fa';
import { BsSortDown, BsSortUp } from 'react-icons/bs';
import AdvancedSearchInput, { validateSearchInput } from './AdvancedSearchInput';
import CardDetailModal from './CardDetailModal';
import SearchHelpModal from './SearchHelpModal';
import { CARD_EVENTS } from '@/utils/cardEvents';

// Import the view components
import ListViewCollect from './ListViewCollect';
import ThumbViewCollect from './ThumbViewCollect';
import ListViewBuilder from './ListViewBuilder';
import ThumbViewBuilder from './ThumbViewBuilder';
import CollectionStatistics from './CollectionStatistics';
import TabletopCanvas from './TabletopCanvas';

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

const PaginationControls = ({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  loading,
  statusMessage
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalPages > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Helper functions to get color styling based on status type
  const getBoxStyle = (type) => {
    switch (type) {
      case 'error':
        return subtleBoxStyle('red.50', 'red.200');
      case 'success':
        // fallthrough
      case 'no-results':
        return subtleBoxStyle('gray.50', 'gray.200');
      default:
        return subtleBoxStyle('blue.50', 'blue.200');
    }
  };

  const getTextStyle = (type) => {
    switch (type) {
      case 'error':
        return subtleTextStyle('red.700');
      case 'success':
        // fallthrough
      case 'no-results':
        return subtleTextStyle('gray.700');
      default:
        return subtleTextStyle('blue.700');
    }
  };

  // Show status message for initial, error, or no-results states
  if (totalItems === 0) {
    if (statusMessage && (statusMessage.type === 'initial' || statusMessage.type === 'error' || statusMessage.type === 'no-results')) {
      const boxStyles = getBoxStyle(statusMessage.type);
      const textStyles = getTextStyle(statusMessage.type);

      return (
        <Box {...boxStyles} textAlign="center">
          {loading && (
            <HStack spacing={4} align="center" justify="center" mb={2}>
              <Spinner size="lg" color="blue.500" />
              <Text {...textStyles}>Searching cards...</Text>
            </HStack>
          )}
          {!loading && (
            <Text {...textStyles}>
              {statusMessage.message}
            </Text>
          )}
        </Box>
      );
    }
    return null;
  }

  // For results, use success color scheme
  const boxStyles = getBoxStyle('success');
  const textStyles = getTextStyle('success');

  return (
    <Box {...boxStyles}>
      <HStack justify="space-between" align="center" spacing={4}>
        {/* Left side - Loading spinner */}
        <HStack spacing={3}>
          {loading && (
            <>
              <Spinner size="md" color="blue.500" />
              <Text {...textStyles} fontSize="sm">Searching cards...</Text>
            </>
          )}
        </HStack>

        {/* Right side - Pagination info and controls */}
        <HStack spacing={4}>
          <Text fontSize="sm" color={textStyles.color}>
            {startItem}-{endItem} of {totalItems}
          </Text>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPageChange(currentPage - 1)}
              isDisabled={currentPage <= 1 || loading}
              px={2}
              minW="auto"
              color={textStyles.color}
              _hover={{ bg: boxStyles.borderColor }}
            >
              &lt;
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPageChange(currentPage + 1)}
              isDisabled={currentPage >= totalPages || loading}
              px={2}
              minW="auto"
              color={textStyles.color}
              _hover={{ bg: boxStyles.borderColor }}
            >
              &gt;
            </Button>
          </HStack>
        </HStack>
      </HStack>
    </Box>
  );
};

PaginationControls.displayName = 'PaginationControls';

// ISOLATED RESULTS COMPONENT - This prevents re-renders during typing
const IsolatedResultsComponent = React.memo(({
  results,
  viewMode,
  mode,
  sortMode,
  sortReverse,
  onCardClick,
  onCountUpdate,
  showProxies,
  thumbnailSize,
  loading
}) => {
  // Sort results within this isolated component (server already limits results)
  const sortedResults = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortMode) {
        case 'rarity':
          const rarityOrder = { 'C': 1, 'UC': 2, 'R': 3, 'SR': 4, 'SEC': 5, 'L': 6, 'SP': 7 };
          const aRarity = rarityOrder[a.rarity] || 0;
          const bRarity = rarityOrder[b.rarity] || 0;
          comparison = aRarity - bRarity;
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;

        case 'card_code':
          comparison = (a.card_code || '').localeCompare(b.card_code || '');
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;

        case 'tags':
          const getTagCount = (card) => {
            const userTags = Array.isArray(card.user_tags) ? card.user_tags.length : 0;
            const globalTags = Array.isArray(card.global_tags) ? card.global_tags.length : 0;
            return userTags + globalTags;
          };
          const aTagCount = getTagCount(a);
          const bTagCount = getTagCount(b);
          comparison = aTagCount - bTagCount;
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;

        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortReverse ? -comparison : comparison;
    });

    return sorted;
  }, [results, sortMode, sortReverse]);

  if (loading || !sortedResults.length) {
    return null;
  }

  // Render the appropriate view with all results (already paginated by server)
  if (viewMode === 'list') {
    return mode === 'collection' ? (
      <ListViewCollect
        cards={sortedResults}
        onCardClick={onCardClick}
        onCountUpdate={onCountUpdate}
        showProxies={showProxies}
      />
    ) : (
      <ListViewBuilder
        cards={sortedResults}
        onCardClick={onCardClick}
      />
    );
  } else {
    return mode === 'collection' ? (
      <ThumbViewCollect
        cards={sortedResults}
        onCardClick={onCardClick}
        onCountUpdate={onCountUpdate}
        showProxies={showProxies}
        thumbnailSize={thumbnailSize}
      />
    ) : (
      <ThumbViewBuilder
        cards={sortedResults}
        onCardClick={onCardClick}
        thumbnailSize={thumbnailSize}
      />
    );
  }
});

IsolatedResultsComponent.displayName = 'IsolatedResultsComponent';

function CardSearch({
  mode = 'collection',
  onCardClick,
  showFilters = true,
  searchKeyword = '',
  onSearchKeywordChange = null
}) {
  // State management
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState({
    type: 'initial',
    message: 'Start typing to search for cards, or enable "In Collection" to view your collection'
  });

  // View and filter states
  const [viewMode, setViewMode] = useState(mode === 'deckbuilder' ? 'thumbnails' : 'list');
  const [inCollection, setInCollection] = useState(false);
  const [showProxies, setShowProxies] = useState(true);
  const [thumbnailSize, setThumbnailSize] = useState(mode === 'collection' ? 160 : 100);
  const [sortMode, setSortMode] = useState('name');
  const [sortReverse, setSortReverse] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalResults, setTotalResults] = useState(0);

  // Modal states
  const [selectedCard, setSelectedCard] = useState(null);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

  // Refs
  const abortControllerRef = useRef(null);
  const lastSearchParamsRef = useRef('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Check if we should use mobile layout for controls
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Helper function to detect and transform card ID patterns
  const transformCardIdPattern = useCallback((searchTerm) => {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return searchTerm;
    }

    const trimmedTerm = searchTerm.trim();

    // Check if the search term matches the pattern C-NNN where:
    // C = one or more letters/numbers (card code)
    // NNN = exactly three digits
    const cardIdPattern = /^([A-Za-z0-9]+)-(\d{3})$/;
    const match = trimmedTerm.match(cardIdPattern);

    if (match) {
      // Transform "P-123" to "id:P-123"
      return `id:${trimmedTerm}`;
    }

    // Return original term if no pattern match
    return searchTerm;
  }, []);

  // Search term change handler - NO side effects on results
  const handleSearchTermChange = useCallback((newTerm) => {
    const termValue = typeof newTerm === 'string' ? newTerm : newTerm.target?.value || '';

    // Auto-detect card ID patterns and transform them
    const transformedTerm = transformCardIdPattern(termValue);

    // ONLY update search term state - nothing else
    setSearchTerm(transformedTerm);

    if (mode === 'deckbuilder' && onSearchKeywordChange) {
      onSearchKeywordChange(transformedTerm);
    }
  }, [mode, onSearchKeywordChange, transformCardIdPattern]);

  const ensureTagsAreArrays = useCallback((card) => {
    if (!card) return card;

    const parsePostgreSQLArray = (pgArray) => {
      if (Array.isArray(pgArray)) return pgArray;
      if (!pgArray || pgArray === 'null') return [];

      if (typeof pgArray === 'string') {
        if (pgArray === '{}') return [];
        const cleaned = pgArray.replace(/[{}]/g, '');
        return cleaned ? cleaned.split(',') : [];
      }

      return [];
    };

    const processedCard = {
      ...card,
      user_tags: parsePostgreSQLArray(card.user_tags),
      global_tags: parsePostgreSQLArray(card.global_tags)
    };

    if (card.location_name !== null && card.location_id !== null) {
      processedCard.location = {
        id: card.location_id,
        name: card.location_name
      };
    } else {
      processedCard.location = null;
    }

    return processedCard;
  }, []);

  // Search function with proper error handling
  const performSearch = useCallback(async (keyword, ownedOnly = false, page = 1, limitPerPage = 25) => {
    const validation = validateSearchInput(keyword, ownedOnly);
    if (!validation.isValid && keyword.trim() && !ownedOnly) {
      setResults([]);
      setTotalResults(0);
      setStatusMessage({ type: 'error', message: validation.message });
      return;
    }

    if (!keyword && !ownedOnly) {
      setResults([]);
      setTotalResults(0);
      setStatusMessage({
        type: 'initial',
        message: 'Start typing to search for cards, or enable "In Collection" to view your collection'
      });
      return;
    }

    const searchParams = {
      keyword: keyword.trim(),
      ownedOnly: ownedOnly.toString(),
      showProxies: 'true',
      limit: limitPerPage.toString(),
      offset: ((page - 1) * limitPerPage).toString()
    };

    const paramsString = JSON.stringify(searchParams);

    // Check if we're already running the same search
    if (lastSearchParamsRef.current === paramsString) {
      return; // Don't run duplicate searches
    }
    lastSearchParamsRef.current = paramsString;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(searchParams);
      const response = await fetch(`${apiUrl}/api/cards/search?${params}`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Handle both new paginated response format and legacy format
      const rawResults = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      const totalCount = data.totalCount || data.total || rawResults.length;

      // Process all cards with the proper tag and location parsing
      const processedResults = rawResults.map(card => ensureTagsAreArrays(card));

      setResults(processedResults);
      setTotalResults(totalCount);
      setError(null);

      if (processedResults.length === 0) {
        setStatusMessage({ type: 'no-results', message: 'No cards found matching your search.' });
      } else {
        const startItem = (page - 1) * limitPerPage + 1;
        const endItem = Math.min(page * limitPerPage, totalCount);
        const message = `Showing ${startItem}-${endItem} of ${totalCount} cards`;
        setStatusMessage({ type: 'success', message });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Search error:', err);
      setError(err.message);
      setResults([]);
      setTotalResults(0);
      setStatusMessage({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    performSearch(searchTerm.trim(), inCollection, newPage, itemsPerPage);
  }, [searchTerm, inCollection, itemsPerPage, performSearch]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    if (newItemsPerPage <= 0) return;
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    performSearch(searchTerm.trim(), inCollection, 1, newItemsPerPage);
  }, [searchTerm, inCollection, performSearch]);

  // Manual search trigger
  const handleManualSearch = useCallback(() => {
    setCurrentPage(1); // Reset to first page on new search
    performSearch(searchTerm.trim(), inCollection, 1, itemsPerPage);
  }, [searchTerm, inCollection, itemsPerPage, performSearch]);

  // Stable handlers
  const handleCardClick = useCallback((card) => {
    if (!card) return;

    if (mode === 'deckbuilder' && onCardClick) {
      onCardClick(card);
    } else {
      const sanitizedCard = ensureTagsAreArrays(card);
      setSelectedCard(sanitizedCard);
      onDetailOpen();
    }
  }, [mode, onCardClick, onDetailOpen]);

  // Count update handler using correct API endpoints
  const handleCountUpdate = useCallback(async (cardId, updateData) => {
    try {
      if (typeof updateData === 'string') {
        // For special string updates, refresh the card data from the API
        const searchParams = new URLSearchParams({
          keyword: `id:${cardId}`,
          ownedOnly: 'false',
          showProxies: 'true'
        });

        const response = await fetch(`${apiUrl}/api/cards/search?${searchParams}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const searchData = await response.json();
          // Handle both formats
          const searchResults = Array.isArray(searchData) ? searchData : searchData.results || [];
          if (searchResults.length > 0) {
            const updatedCard = ensureTagsAreArrays(searchResults[0]);
            setResults(prev => {
              const oldCard = prev.find(card => card.id === cardId);
              const newResults = prev.map(card =>
                card.id === cardId ? { ...card, ...updatedCard } : card
              );
              return newResults;
            });

            if (selectedCard && selectedCard.id === cardId) {
              setSelectedCard(prev => ({ ...prev, ...updatedCard }));
            }
          } else {
            console.warn(`handleCountUpdate - No search results found for ${cardId}`);
          }
        } else {
          console.error(`handleCountUpdate - API error for ${cardId}:`, response.status, response.statusText);
        }
      } else if (typeof updateData === 'object' && updateData !== null) {
        // For object updates (count changes from CountControl), directly update the results
        setResults(prev =>
          prev.map(card =>
            card.id === cardId ? { ...card, ...updateData } : card
          )
        );

        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(prev => ({ ...prev, ...updateData }));
        }
      }
    } catch (error) {
      console.error(`handleCountUpdate - Error for ${cardId}:`, error);
    }
  }, [apiUrl, selectedCard, ensureTagsAreArrays]);

  // Helper functions
  const getSortIcon = (currentSortMode) => {
    switch (currentSortMode) {
      case 'rarity': return FiHash;
      case 'card_code': return FiType;
      case 'tags': return FiTag;
      default: return FiSearch;
    }
  };

  const getStatusBoxStyle = (type) => {
    switch (type) {
      case 'error':
        return subtleBoxStyle('red.50', 'red.200');
      case 'success':
      case 'no-results':
        return subtleBoxStyle('green.50', 'green.200');
      default:
        return subtleBoxStyle('blue.50', 'blue.200');
    }
  };

  const getStatusTextStyle = (type) => {
    switch (type) {
      case 'error':
        return subtleTextStyle('red.700');
      case 'success':
      case 'no-results':
        return subtleTextStyle('green.700');
      default:
        return subtleTextStyle('blue.700');
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize from external search keyword - SIMPLE VERSION
  useEffect(() => {
    if (mode === 'deckbuilder' && searchKeyword && !searchTerm) {
      setSearchTerm(searchKeyword);
    }
  }, [searchKeyword, mode, searchTerm]);

  // Collection toggle handler
  useEffect(() => {
    if (!performSearch || !isClient) return;

    setCurrentPage(1); // Reset to first page when toggling collection
    // Clear the lastSearchParamsRef when toggling collection state
    // This ensures the search will run even if parameters appear identical
    lastSearchParamsRef.current = '';

    if (inCollection) {
      performSearch(searchTerm.trim(), true, 1, itemsPerPage);
    } else {
      if (searchTerm.trim()) {
        performSearch(searchTerm.trim(), false, 1, itemsPerPage);
      } else {
        setResults([]);
        setTotalResults(0);
        setStatusMessage({
          type: 'initial',
          message: 'Start typing to search for cards, or enable "In Collection" to view your collection'
        });
      }
    }
  }, [inCollection, isClient]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCardUpdate = (event) => {
      const { cardId, card } = event.detail;

      // Use the updated card data from the event if provided
      if (card) {
        setResults(currentResults => {
          const cardInResults = currentResults.some(result => result.id === cardId);
          if (!cardInResults) return currentResults;

          // FIX: Ensure the updated card has valid tag arrays
          const sanitizedCard = ensureTagsAreArrays(card);

          // Update the card with the fresh data from the event
          return currentResults.map(result =>
            result.id === cardId ? { ...result, ...sanitizedCard } : result
          );
        });

        // Update selected card if it matches
        setSelectedCard(currentSelected => {
          if (currentSelected && currentSelected.id === cardId) {
            // FIX: Ensure selected card has valid tag arrays
            const sanitizedCard = ensureTagsAreArrays(card);
            return { ...currentSelected, ...sanitizedCard };
          }
          return currentSelected;
        });
      }
    };

    // Add event listeners for all card update types
    window.addEventListener(CARD_EVENTS.TAG_UPDATED, handleCardUpdate);
    window.addEventListener(CARD_EVENTS.LOCATION_UPDATED, handleCardUpdate);
    window.addEventListener(CARD_EVENTS.COUNT_UPDATED, handleCardUpdate);

    // Cleanup function
    return () => {
      window.removeEventListener(CARD_EVENTS.TAG_UPDATED, handleCardUpdate);
      window.removeEventListener(CARD_EVENTS.LOCATION_UPDATED, handleCardUpdate);
      window.removeEventListener(CARD_EVENTS.COUNT_UPDATED, handleCardUpdate);
    };
  }, []); // Empty dependency array - no re-renders!

  if (!isClient) {
    return (
      <Box p={6}>
        <Box {...subtleBoxStyle('blue.50', 'blue.200')}>
          <HStack spacing={4} align="center" justify="center">
            <Spinner size="lg" color="blue.500" />
            <Text {...subtleTextStyle('blue.700')}>Loading Card Search...</Text>
          </HStack>
        </Box>
      </Box>
    );
  }

  const shouldShowFilters = showFilters && (mode === 'collection' || mode === 'deckbuilder');
  const shouldShowCollectionFilters = showFilters && (mode === 'collection' || mode === 'deckbuilder');
  const shouldShowProxyFilters = showFilters && mode === 'collection';
  const SortIcon = getSortIcon(sortMode);

  return (
    <VStack spacing={4} align="stretch">
      {/* Collection Statistics - Only show in collection mode */}
      {mode === 'collection' && <CollectionStatistics />}
      {/* Tabletop Canvas - Only show in collection mode */}
      {mode === 'collection' && (
        <TabletopCanvas
          cards={results}
          onCardClick={handleCardClick}
          onCountUpdate={handleCountUpdate}
          onLocationUpdate={async (cardId, locationValue) => {
            try {
              const locationId = locationValue === null ? null : parseInt(locationValue);
              const response = await fetch(`${apiUrl}/api/collection/location`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                  cardId: cardId,
                  locationId: locationId
                })
              });

              if (!response.ok) {
                // Throw a specific error that includes the HTTP status
                const errorText = await response.text();
                console.error(`API error: HTTP ${response.status}: ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }

              const responseData = await response.json();

              // Refresh card data in search results (same pattern as count updates)
              await handleCountUpdate(cardId, 'location_updated');
            } catch (error) {
              console.error(`Error in onLocationUpdate for ${cardId}:`, error);
              // Re-throw the error so TabletopCanvas can catch it and show in dialog
              throw error;
            }
          }}

        />
      )}

      {/* Search Input */}
      <VStack spacing={3} align="stretch">
        <HStack>
          <AdvancedSearchInput
            value={searchTerm}
            onChange={handleSearchTermChange}
            placeholder={mode === 'deckbuilder' ?
              'Search cards for deck... (Press Enter or click Search)' :
              'Search cards... (Press Enter or click Search)'}
            onSearch={handleManualSearch}
          />
          <IconButton
            icon={<QuestionOutlineIcon />}
            size="sm"
            variant="ghost"
            onClick={onHelpOpen}
            aria-label="Search Help"
          />
        </HStack>

        {/* Controls */}
        {shouldShowFilters && (
          <VStack spacing={3} align="stretch">
            {isMobile ? (
              // Mobile layout: Multiple rows
              <>
                {/* First row: View Toggle | Sort Type | Sort Mode */}
                <HStack spacing={4}>

                  <Tooltip label={`Switch to ${viewMode === 'list' ? 'thumbnail' : 'list'} view`}>
                    <IconButton
                      icon={viewMode === 'list' ? <FaGripHorizontal /> : <FaGripLines />}
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode(viewMode === 'list' ? 'thumbnails' : 'list')}
                      aria-label={`Switch to ${viewMode === 'list' ? 'thumbnail' : 'list'} view`}
                    />
                  </Tooltip>

                  <Menu>
                    <MenuButton as={IconButton} icon={<SortIcon />} size="sm" variant="outline" />
                    <MenuList>
                      <MenuItem onClick={() => setSortMode('name')}>
                        <HStack><FiSearch /><Text>Name</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('rarity')}>
                        <HStack><FiHash /><Text>Rarity</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('card_code')}>
                        <HStack><FiType /><Text>Card Code</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('tags')}>
                        <HStack><FiTag /><Text>Tags</Text></HStack>
                      </MenuItem>
                    </MenuList>
                  </Menu>

                  <Tooltip label={`Sort ${sortReverse ? 'ascending' : 'descending'}`}>
                    <IconButton
                      icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                      size="sm"
                      variant="outline"
                      onClick={() => setSortReverse(!sortReverse)}
                      aria-label={`Sort ${sortReverse ? 'ascending' : 'descending'}`}
                    />
                  </Tooltip>
                </HStack>

                {/* Second row: Collection switches */}
                {shouldShowCollectionFilters && (
                  <HStack spacing={4}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="in-collection" mb="0" fontSize="sm">
                        In Collection
                      </FormLabel>
                      <Switch
                        id="in-collection"
                        isChecked={inCollection}
                        onChange={(e) => setInCollection(e.target.checked)}
                        size="sm"
                      />
                    </FormControl>

                    {shouldShowProxyFilters && (
                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="show-proxies" mb="0" fontSize="sm">
                          Show Proxies
                        </FormLabel>
                        <Switch
                          id="show-proxies"
                          isChecked={showProxies}
                          onChange={(e) => setShowProxies(e.target.checked)}
                          size="sm"

                        />
                      </FormControl>

                    )}
                  </HStack>
                )}

                {/* Third row: Thumbnail slider */}
                {viewMode === 'thumbnails' && (
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600" minW="60px">Size:</Text>
                    <Box width="120px">
                      <Slider
                        value={thumbnailSize}
                        onChange={setThumbnailSize}
                        min={80}
                        max={200}
                        step={10}
                        size="sm"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={3} />
                      </Slider>
                    </Box>
                    <Text fontSize="sm" color="gray.500" minW="35px">{thumbnailSize}</Text>
                  </HStack>
                )}
              </>
            ) : (
              // Desktop layout: Single row (original)
              <HStack justify="space-between" align="center">
                <HStack spacing={4}>
                  <Tooltip label={`Switch to ${viewMode === 'list' ? 'thumbnail' : 'list'} view`}>
                    <IconButton
                      icon={viewMode === 'list' ? <FaGripHorizontal /> : <FaGripLines />}
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode(viewMode === 'list' ? 'thumbnails' : 'list')}
                      aria-label={`Switch to ${viewMode === 'list' ? 'thumbnail' : 'list'} view`}
                    />
                  </Tooltip>

                  <Menu>
                    <MenuButton as={IconButton} icon={<SortIcon />} size="sm" variant="outline" />
                    <MenuList>
                      <MenuItem onClick={() => setSortMode('name')}>
                        <HStack><FiSearch /><Text>Name</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('rarity')}>
                        <HStack><FiHash /><Text>Rarity</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('card_code')}>
                        <HStack><FiType /><Text>Card Code</Text></HStack>
                      </MenuItem>
                      <MenuItem onClick={() => setSortMode('tags')}>
                        <HStack><FiTag /><Text>Tags</Text></HStack>
                      </MenuItem>
                    </MenuList>
                  </Menu>

                  <Tooltip label={`Sort ${sortReverse ? 'ascending' : 'descending'}`}>
                    <IconButton
                      icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                      size="sm"
                      variant="outline"
                      onClick={() => setSortReverse(!sortReverse)}
                      aria-label={`Sort ${sortReverse ? 'ascending' : 'descending'}`}
                    />
                  </Tooltip>
                </HStack>

                {viewMode === 'thumbnails' && (
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600" minW="60px">Size:</Text>
                    <Box width="120px">
                      <Slider
                        value={thumbnailSize}
                        onChange={setThumbnailSize}
                        min={80}
                        max={200}
                        step={10}
                        size="sm"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={3} />
                      </Slider>
                    </Box>
                    <Text fontSize="sm" color="gray.500" minW="35px">{thumbnailSize}</Text>
                  </HStack>
                )}


                {/* Collection-specific filters */}
                {shouldShowCollectionFilters && (
                  <HStack spacing={4}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="in-collection" mb="0" fontSize="sm">
                        In Collection
                      </FormLabel>
                      <Switch
                        id="in-collection"
                        isChecked={inCollection}
                        onChange={(e) => setInCollection(e.target.checked)}
                        size="sm"
                      />
                    </FormControl>

                      {shouldShowProxyFilters && (
                        <FormControl display="flex" alignItems="center">
                          <FormLabel htmlFor="show-proxies" mb="0" fontSize="sm">
                            Show Proxies
                          </FormLabel>
                          <Switch
                            id="show-proxies"
                            isChecked={showProxies}
                            onChange={(e) => setShowProxies(e.target.checked)}
                            size="sm"
                          />
                        </FormControl>
                      )}
                    </HStack>
                  )}
              </HStack>
            )}
          </VStack>
        )}
      </VStack>

      {/* Pagination Controls with integrated status */}
      <PaginationControls
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalResults}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        loading={loading}
        statusMessage={statusMessage}
      />

      {/* Results */}
      <IsolatedResultsComponent
        results={results}
        viewMode={viewMode}
        mode={mode}
        sortMode={sortMode}
        sortReverse={sortReverse}
        onCardClick={handleCardClick}
        onCountUpdate={handleCountUpdate}
        showProxies={showProxies}
        thumbnailSize={thumbnailSize}
        loading={loading}
      />

      {/* Modals */}
      <CardDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        selectedCard={selectedCard}
        showProxies={showProxies}
        onCountUpdate={handleCountUpdate}
      />
      <SearchHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
    </VStack>
  );
}

export default CardSearch;
