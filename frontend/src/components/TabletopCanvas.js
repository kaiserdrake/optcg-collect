'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  IconButton,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Collapse,
  useDisclosure,
  Badge,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Checkbox,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FiHash, FiTag, FiMapPin, FiSettings } from 'react-icons/fi';
import DeckCard from './DeckCard';
import CardDetailModal from './CardDetailModal';
import { CARD_EVENTS } from '@/utils/cardEvents';

const TabletopCanvas = ({
  cards = [],
  onCardClick,
  onCountUpdate,
  onLocationUpdate,
  onTagUpdate
}) => {
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: false });
  const { isOpen: isCardDetailOpen, onOpen: onCardDetailOpen, onClose: onCardDetailClose } = useDisclosure();
  const { isOpen: isBulkMoveOpen, onOpen: onBulkMoveOpen, onClose: onBulkMoveClose } = useDisclosure();
  const { isOpen: isBulkCountOpen, onOpen: onBulkCountOpen, onClose: onBulkCountClose } = useDisclosure();
  const { isOpen: isBulkProxyOpen, onOpen: onBulkProxyOpen, onClose: onBulkProxyClose } = useDisclosure();
  const { isOpen: isBulkTagOpen, onOpen: onBulkTagOpen, onClose: onBulkTagClose } = useDisclosure();
  const { isOpen: isFailedMoveOpen, onOpen: onFailedMoveOpen, onClose: onFailedMoveClose } = useDisclosure();

  const [sortMode, setSortMode] = useState('name');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(60);
  const [selectedCard, setSelectedCard] = useState(null);

  // State for location selection
  const [locations, setLocations] = useState([]);
  const [selectedMoveAllLocation, setSelectedMoveAllLocation] = useState('');
  const [isMovingAll, setIsMovingAll] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Bulk operation states
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkProxyCount, setBulkProxyCount] = useState(0);
  const [bulkTag, setBulkTag] = useState('');

  // Failed move tracking
  const [failedMoveData, setFailedMoveData] = useState({
    failedCards: [],
    successCount: 0,
    operationType: ''
  });

  const toast = useToast();

  // Store selected card data to persist across searches (ORIGINAL APPROACH)
  const [selectedCardData, setSelectedCardData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('tabletopSelectedCardData');
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (e) {
          console.warn('Failed to parse saved selected card data:', e);
        }
      }
    }
    return {};
  });

  // Use persistent selected cards that survive search changes (ORIGINAL APPROACH)
  const [selectedCards, setSelectedCards] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('tabletopSelectedCards');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Set(parsed);
        } catch (e) {
          console.warn('Failed to parse saved selected cards:', e);
        }
      }
    }
    return new Set();
  });

  // Fetch locations when bulk move modal opens
  useEffect(() => {
    if (isBulkMoveOpen) {
      fetch(`${apiUrl}/api/locations`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setLocations(data))
        .catch(error => console.error('Failed to fetch locations:', error));
    }
  }, [isBulkMoveOpen, apiUrl]);

  // Listen for card updates from CardDetailModal (ORIGINAL APPROACH)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCardUpdate = (event) => {
      const { cardId, card } = event.detail;

      // Update the card data in selectedCardData if it exists
      setSelectedCardData(prevData => {
        if (prevData[cardId]) {
          const updatedData = {
            ...prevData,
            [cardId]: { ...prevData[cardId], ...card }
          };
          sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(updatedData));
          return updatedData;
        }
        return prevData;
      });

      // Update selectedCard if it's currently being viewed
      setSelectedCard(prevSelected => {
        if (prevSelected && prevSelected.id === cardId) {
          return { ...prevSelected, ...card };
        }
        return prevSelected;
      });
    };

    window.addEventListener(CARD_EVENTS.TAG_UPDATED, handleCardUpdate);
    window.addEventListener(CARD_EVENTS.LOCATION_UPDATED, handleCardUpdate);
    window.addEventListener(CARD_EVENTS.COUNT_UPDATED, handleCardUpdate);

    return () => {
      window.removeEventListener(CARD_EVENTS.TAG_UPDATED, handleCardUpdate);
      window.removeEventListener(CARD_EVENTS.LOCATION_UPDATED, handleCardUpdate);
      window.removeEventListener(CARD_EVENTS.COUNT_UPDATED, handleCardUpdate);
    };
  }, []);

  // Update selected card data when cards change (ORIGINAL APPROACH)
  const updateSelectedCardDataFromCards = useCallback(() => {
    setSelectedCardData(prevData => {
      const newCardData = { ...prevData };
      let dataChanged = false;

      cards.forEach(card => {
        if (selectedCards.has(card.id)) {
          if (!newCardData[card.id] || JSON.stringify(newCardData[card.id]) !== JSON.stringify(card)) {
            newCardData[card.id] = card;
            dataChanged = true;
          }
        }
      });

      if (dataChanged) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(newCardData));
        }
        return newCardData;
      }
      return prevData;
    });
  }, [cards, selectedCards]);

  useEffect(() => {
    updateSelectedCardDataFromCards();
  }, [updateSelectedCardDataFromCards]);

  // Count update handler (ORIGINAL APPROACH)
  const handleCardDetailUpdate = useCallback(async (cardId, updateData) => {
    try {
      if (typeof updateData === 'string') {
        const searchParams = new URLSearchParams({
          keyword: `id:${cardId}`,
          ownedOnly: 'false',
          showProxies: 'true'
        });

        const response = await fetch(`${apiUrl}/api/cards/search?${searchParams}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const searchResults = await response.json();
          if (searchResults.length > 0) {
            const updatedCard = searchResults[0];

            setSelectedCardData(prevData => {
              if (prevData[cardId]) {
                const newData = {
                  ...prevData,
                  [cardId]: updatedCard
                };
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(newData));
                }
                return newData;
              }
              return prevData;
            });

            setSelectedCard(prevSelected => {
              if (prevSelected && prevSelected.id === cardId) {
                return updatedCard;
              }
              return prevSelected;
            });
          }
        }
      } else if (typeof updateData === 'object' && updateData !== null) {
        setSelectedCardData(prevData => {
          if (prevData[cardId]) {
            const newData = {
              ...prevData,
              [cardId]: { ...prevData[cardId], ...updateData }
            };
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(newData));
            }
            return newData;
          }
          return prevData;
        });

        setSelectedCard(prevSelected => {
          if (prevSelected && prevSelected.id === cardId) {
            return { ...prevSelected, ...updateData };
          }
          return prevSelected;
        });
      }
    } catch (error) {
      console.warn('Failed to refresh card data:', error);
    }
  }, [apiUrl]);

  // Handle card selection for bulk operations (ORIGINAL APPROACH)
  const handleCardSelection = useCallback((cardId, isSelected) => {
    setSelectedCards(prevSelected => {
      const newSelected = new Set(prevSelected);

      if (isSelected) {
        newSelected.add(cardId);
      } else {
        newSelected.delete(cardId);
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tabletopSelectedCards', JSON.stringify([...newSelected]));
      }

      return newSelected;
    });

    setSelectedCardData(prevData => {
      const newCardData = { ...prevData };

      if (isSelected) {
        const card = cards.find(c => c.id === cardId) || prevData[cardId];
        if (card) {
          newCardData[cardId] = card;
        }
      } else {
        delete newCardData[cardId];
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(newCardData));
      }

      return newCardData;
    });
  }, [cards]);

  // Handle card click for viewing details (ORIGINAL APPROACH)
  const handleCardClick = useCallback((card) => {
    if (!card) return;

    if (onCardClick) {
      onCardClick(card);
    } else {
      setSelectedCard(card);
      onCardDetailOpen();
    }
  }, [onCardClick, onCardDetailOpen]);

  // Handle select all/none (ORIGINAL APPROACH)
  const handleSelectAll = useCallback(() => {
    const currentSearchCardIds = cards.map(card => card.id);
    const currentlySelectedFromSearch = currentSearchCardIds.filter(id => selectedCards.has(id));

    let newSelected = new Set(selectedCards);
    let newCardData = { ...selectedCardData };

    if (currentlySelectedFromSearch.length === currentSearchCardIds.length) {
      currentSearchCardIds.forEach(id => {
        newSelected.delete(id);
        delete newCardData[id];
      });
    } else {
      cards.forEach(card => {
        newSelected.add(card.id);
        newCardData[card.id] = card;
      });
    }

    setSelectedCards(newSelected);
    setSelectedCardData(newCardData);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tabletopSelectedCards', JSON.stringify([...newSelected]));
      sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify(newCardData));
    }
  }, [cards, selectedCards, selectedCardData]);

  // Clear all selected cards (ORIGINAL APPROACH)
  const handleClearAll = useCallback(() => {
    setSelectedCards(new Set());
    setSelectedCardData({});

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tabletopSelectedCards', JSON.stringify([]));
      sessionStorage.setItem('tabletopSelectedCardData', JSON.stringify({}));
    }

    toast({
      title: 'Selection cleared',
      description: 'All selected cards have been removed from tabletop',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [toast]);

  // Combine current search results with selected cards from previous searches (ORIGINAL APPROACH)
  const allDisplayCards = useMemo(() => {
    const cardMap = new Map();

    // Add current search results (these take priority for freshness)
    cards.forEach(card => {
      cardMap.set(card.id, card);
    });

    // Add selected cards from previous searches that aren't in current results
    Object.values(selectedCardData).forEach(card => {
      if (selectedCards.has(card.id) && !cardMap.has(card.id)) {
        cardMap.set(card.id, card);
      }
    });

    return Array.from(cardMap.values());
  }, [cards, selectedCardData, selectedCards]);

  // Sort cards (ORIGINAL APPROACH)
  const sortedCards = useMemo(() => {
    if (!Array.isArray(allDisplayCards) || allDisplayCards.length === 0) {
      return [];
    }

    const sorted = [...allDisplayCards].sort((a, b) => {
      let comparison = 0;

      switch (sortMode) {
        case 'cost':
          const aCost = a.cost || 0;
          const bCost = b.cost || 0;
          comparison = aCost - bCost;
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;

        case 'type':
          comparison = (a.category || '').localeCompare(b.category || '');
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;

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

        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortReverse ? -comparison : comparison;
    });

    return sorted;
  }, [allDisplayCards, sortMode, sortReverse]);

  const handleBulkMoveLocation = useCallback(async () => {
    if (selectedCards.size === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select cards first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedMoveAllLocation) {
      toast({
        title: 'No Location Selected',
        description: 'Please select a location first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsMovingAll(true);

    const successfulMoves = [];
    const failedMoves = [];

    try {
      // Use onLocationUpdate for each card (this ensures CardSearch gets updated)
      for (const cardId of selectedCards) {
        try {
          if (onLocationUpdate) {
            const locationValue = selectedMoveAllLocation === 'remove' ? null : selectedMoveAllLocation;
            await onLocationUpdate(cardId, locationValue);
            successfulMoves.push({ cardId, locationId: locationValue });
          }
        } catch (error) {
          // Determine the reason for failure
          let reason = 'Unknown error';
          if (error.message && error.message.includes('404')) {
            reason = 'Not in collection';
          } else if (error.message) {
            reason = error.message;
          }

          const cardData = selectedCardData[cardId] || cards.find(c => c.id === cardId);
          failedMoves.push({
            cardId,
            baseCardId: cardId,
            reason: reason,
            cardName: cardData?.name || cardId,
            cardCode: cardData?.card_code || cardId
          });
        }
      }

      // Show success message if we have successful moves
      if (successfulMoves.length > 0) {
        const locationName = selectedMoveAllLocation === 'remove'
          ? 'removed from all locations'
          : locations.find(l => l.id.toString() === selectedMoveAllLocation)?.name || 'selected location';

        toast({
          title: 'Location Update Complete',
          description: `Successfully moved ${successfulMoves.length} card${successfulMoves.length > 1 ? 's' : ''} to ${locationName}`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      }

      // Show failed moves in dialog if there are any
      if (failedMoves.length > 0) {
        const locationName = selectedMoveAllLocation === 'remove'
          ? 'remove location'
          : locations.find(l => l.id.toString() === selectedMoveAllLocation)?.name || 'selected location';

        setFailedMoveData({
          failedCards: failedMoves,
          successCount: successfulMoves.length,
          operationType: `move to ${locationName}`
        });
        onFailedMoveOpen();
      }

      // DO NOT clear selection - keep cards selected (same as Bulk Set Count)
      // setSelectedCards(new Set());
      // setSelectedCardData({});

      onBulkMoveClose();
    } catch (error) {
      console.error('Error in bulk move operation:', error);
      toast({
        title: 'Operation Failed',
        description: 'An unexpected error occurred during the bulk move operation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMovingAll(false);
      setSelectedMoveAllLocation('');
    }
  }, [selectedCards, selectedMoveAllLocation, onLocationUpdate, toast, onBulkMoveClose, locations, selectedCardData, cards, setFailedMoveData, onFailedMoveOpen]);


  const handleBulkSetCount = useCallback(async () => {
    if (selectedCards.size === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select cards first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      for (const cardId of selectedCards) {
        // Card ID is already the correct format (card code like "OP02-018")
        // No need to parseInt since the database uses VARCHAR card codes as primary keys
        const response = await fetch(`${apiUrl}/api/collection/set-count`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            cardId: cardId, // Use card code directly
            ownedCount: bulkCount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update count for card ${cardId}`);
        }
      }

      // Call onCountUpdate for UI refresh (ORIGINAL APPROACH)
      if (onCountUpdate) {
        for (const cardId of selectedCards) {
          onCountUpdate(cardId, 'count_updated');
        }
      }

      toast({
        title: 'Count updated',
        description: `Updated count to ${bulkCount} for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onBulkCountClose();
    } catch (error) {
      console.error('Error in bulk set count:', error);
      toast({
        title: 'Error',
        description: 'Failed to update count. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkCount, apiUrl, onCountUpdate, toast, onBulkCountClose]);

  const handleBulkSetProxyCount = useCallback(async () => {
    if (selectedCards.size === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select cards first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      for (const cardId of selectedCards) {
        // Card ID is already the correct format (card code like "OP02-018")
        // No need to parseInt since the database uses VARCHAR card codes as primary keys
        const response = await fetch(`${apiUrl}/api/collection/set-count`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            cardId: cardId, // Use card code directly
            proxyCount: bulkProxyCount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update proxy count for card ${cardId}`);
        }
      }

      // Call onCountUpdate for UI refresh (ORIGINAL APPROACH)
      if (onCountUpdate) {
        for (const cardId of selectedCards) {
          onCountUpdate(cardId, 'count_updated');
        }
      }

      toast({
        title: 'Proxy count updated',
        description: `Updated proxy count to ${bulkProxyCount} for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onBulkProxyClose();
    } catch (error) {
      console.error('Error in bulk set proxy count:', error);
      toast({
        title: 'Error',
        description: 'Failed to update proxy count. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkProxyCount, apiUrl, onCountUpdate, toast, onBulkProxyClose]);

  const handleBulkSetTag = useCallback(async () => {
    if (selectedCards.size === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select cards first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      for (const cardId of selectedCards) {
        if (onTagUpdate) {
          await onTagUpdate(cardId, bulkTag);
        }
      }

      toast({
        title: 'Tags updated',
        description: `Updated tags for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onBulkTagClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tags',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkTag, onTagUpdate, toast, onBulkTagClose]);

  return (
    <VStack spacing={4} align="stretch">
      {/* Tabletop Header */}
      <HStack justify="space-between" align="center">
        <HStack spacing={3}>
          <Button
            leftIcon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={onToggle}
            variant="outline"
            size="sm"
          >
            Tabletop Canvas
          </Button>
          <Badge variant="solid" colorScheme={selectedCards.size > 0 ? 'blue' : 'gray'}>
            {selectedCards.size} selected
          </Badge>
          {selectedCards.size > 0 && (
            <Button size="xs" variant="ghost" colorScheme="red" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
        </HStack>

        <Text fontSize="sm" color="gray.600">
          {allDisplayCards.length} cards shown
        </Text>
      </HStack>

      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={4} align="stretch">
          {/* Controls */}
          <HStack spacing={4} wrap="wrap" justify="space-between">
            <HStack spacing={3}>
              {/* Sort Controls */}
              <HStack spacing={2}>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">Sort:</Text>
                <Select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  size="sm"
                  width="120px"
                >
                  <option value="name">Name</option>
                  <option value="cost">Cost</option>
                  <option value="type">Type</option>
                  <option value="rarity">Rarity</option>
                  <option value="card_code">Card Code</option>
                </Select>
              </HStack>

              <Tooltip label={sortReverse ? 'Sort ascending' : 'Sort descending'}>
                <IconButton
                  icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                  size="sm"
                  variant="outline"
                  onClick={() => setSortReverse(!sortReverse)}
                />
              </Tooltip>

              {/* Thumbnail Size Slider */}
              <HStack spacing={2} minW="120px">
                <Text fontSize="xs" color="gray.600">Size:</Text>
                <Slider
                  value={thumbnailSize}
                  onChange={setThumbnailSize}
                  min={40}
                  max={120}
                  step={20}
                  width="80px"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </HStack>
            </HStack>

            <HStack spacing={2}>
              {/* Selection Controls */}
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                {cards.length > 0 && cards.every(card => selectedCards.has(card.id)) ? 'Deselect Current' : 'Select Current'}
              </Button>

              {/* Bulk Actions */}
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon />}
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  isDisabled={selectedCards.size === 0}
                >
                  Actions
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={onBulkMoveOpen}>
                    <FiMapPin style={{ marginRight: '8px' }} />
                    Bulk Move Location
                  </MenuItem>
                  <MenuItem onClick={onBulkCountOpen}>
                    <FiHash style={{ marginRight: '8px' }} />
                    Bulk Set Count
                  </MenuItem>
                  <MenuItem onClick={onBulkProxyOpen}>
                    <FiSettings style={{ marginRight: '8px' }} />
                    Bulk Set Proxy Count
                  </MenuItem>
                  <MenuItem onClick={onBulkTagOpen}>
                    <FiTag style={{ marginRight: '8px' }} />
                    Bulk Set Tag
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>

          {/* Cards Grid - Fixed to 2 rows */}
          <Box
            bg="gray.50"
            borderRadius="md"
            p={4}
            border="1px solid"
            borderColor="gray.200"
            height="200px"
            overflowY="auto"
          >
            {sortedCards.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No cards in tabletop</Text>
                <Text color="gray.400" fontSize="sm" mt={1}>
                  Search for cards to see them appear here
                </Text>
              </Box>
            ) : (
              <Grid
                templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`}
                templateRows={`repeat(2, minmax(${Math.floor(thumbnailSize * 1.4)}px, 1fr))`}
                gap={1}
                justifyItems="center"
                height="100%"
                overflowY="auto"
              >
                {sortedCards.map((card) => {
                  const isSelected = selectedCards.has(card.id);
                  const isFromCurrentSearch = cards.some(c => c.id === card.id);

                  return (
                    <Box key={card.id} position="relative">
                      {/* Selection Checkbox */}
                      <Checkbox
                        position="absolute"
                        top="-8px"
                        left="-8px"
                        zIndex={2}
                        isChecked={isSelected}
                        onChange={(e) => handleCardSelection(card.id, e.target.checked)}
                        bg="white"
                        borderRadius="full"
                        p={1}
                      />

                      {/* Card with grayscale filter when not selected */}
                      <Box
                        border={isSelected ? "2px solid" : "1px solid"}
                        borderColor={isSelected ? "blue.400" : "transparent"}
                        borderRadius="md"
                        transition="all 0.2s"
                        filter={isSelected ? "none" : "grayscale(100%)"}
                        opacity={isFromCurrentSearch ? 1 : 0.8}
                        _hover={{
                          filter: isSelected ? "none" : "grayscale(50%)",
                          opacity: 1
                        }}
                      >
                        <DeckCard
                          item={{ card, count: card.owned_count || 1 }}
                          onCardClick={handleCardClick}
                          isViewOnly={true}
                          thumbnailSize={thumbnailSize}
                          hideCount={true}
                        />
                      </Box>

                      {/* Indicator for cards from previous searches */}
                      {!isFromCurrentSearch && (
                        <Box
                          position="absolute"
                          bottom="2px"
                          right="2px"
                          bg="yellow.400"
                          color="black"
                          fontSize="xs"
                          px={1}
                          borderRadius="sm"
                          fontWeight="bold"
                        >
                          📌
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            )}
          </Box>
        </VStack>
      </Collapse>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={isCardDetailOpen}
        onClose={onCardDetailClose}
        selectedCard={selectedCard}
        interactive={true}
        onCountUpdate={handleCardDetailUpdate}
      />

      {/* Bulk Move Location Modal */}
      <Modal isOpen={isBulkMoveOpen} onClose={onBulkMoveClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiMapPin />
              <Text>Move Selected Cards to Location</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Moving {selectedCards.size} selected cards to a new location.
              </Text>

              <FormControl>
                <FormLabel>Select Location</FormLabel>
                <Select
                  value={selectedMoveAllLocation}
                  onChange={(e) => setSelectedMoveAllLocation(e.target.value)}
                  placeholder="Choose a location..."
                >
                  <option value="remove">Remove Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {selectedMoveAllLocation && (
                <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <Text fontSize="sm" color="blue.700">
                    {selectedMoveAllLocation === 'remove'
                      ? 'Cards will have their location removed'
                      : `Cards will be moved to: ${locations.find(l => l.id.toString() === selectedMoveAllLocation)?.name}`
                    }
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onBulkMoveClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleBulkMoveLocation}
              isLoading={isMovingAll}
              loadingText="Moving..."
              isDisabled={!selectedMoveAllLocation}
            >
              Move {selectedCards.size} cards
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Set Count Modal */}
      <Modal isOpen={isBulkCountOpen} onClose={onBulkCountClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bulk Set Count</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Count</FormLabel>
              <NumberInput
                value={bulkCount}
                onChange={(_, num) => setBulkCount(num)}
                min={0}
                max={99}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onBulkCountClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleBulkSetCount}>
              Update {selectedCards.size} cards
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Set Proxy Count Modal */}
      <Modal isOpen={isBulkProxyOpen} onClose={onBulkProxyClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bulk Set Proxy Count</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Proxy Count</FormLabel>
              <NumberInput
                value={bulkProxyCount}
                onChange={(_, num) => setBulkProxyCount(num)}
                min={0}
                max={99}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onBulkProxyClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleBulkSetProxyCount}>
              Update {selectedCards.size} cards
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Set Tag Modal */}
      <Modal isOpen={isBulkTagOpen} onClose={onBulkTagClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bulk Set Tag</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Tag</FormLabel>
              <Select
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                placeholder="Select a tag"
              >
                <option value="want">Want</option>
                <option value="have">Have</option>
                <option value="favorite">Favorite</option>
                <option value="trade">Trade</option>
                <option value="sell">Sell</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onBulkTagClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleBulkSetTag}>
              Update {selectedCards.size} cards
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Failed Move Results Dialog */}
      <Modal isOpen={isFailedMoveOpen} onClose={onFailedMoveClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiMapPin />
              <Text>Move Operation Results</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {failedMoveData.successCount > 0 && (
                <Alert status="success">
                  <AlertIcon />
                  <AlertTitle>Successfully moved {failedMoveData.successCount} cards!</AlertTitle>
                </Alert>
              )}

              {failedMoveData.failedCards.length > 0 && (
                <>
                  <Alert status="warning">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <AlertTitle>
                        {failedMoveData.failedCards.length} card{failedMoveData.failedCards.length > 1 ? 's' : ''} could not be moved
                      </AlertTitle>
                      <AlertDescription>
                        The following cards could not be updated to {failedMoveData.operationType}:
                      </AlertDescription>
                    </VStack>
                  </Alert>

                  <Box maxH="300px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md">
                    <Table size="sm">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Card Name</Th>
                          <Th>Card Code</Th>
                          <Th>Reason</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {failedMoveData.failedCards.map((failed, index) => (
                          <Tr key={index}>
                            <Td fontWeight="medium">{failed.cardName}</Td>
                            <Td color="gray.600">{failed.cardCode}</Td>
                            <Td>
                              <Badge
                                colorScheme={failed.reason === 'Not in collection' ? 'blue' : 'red'}
                                variant="subtle"
                              >
                                {failed.reason}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>

                  <Text fontSize="sm" color="gray.600">
                    Cards marked as "Not in collection" are not owned by you and were skipped.
                    Other errors may require checking your collection or trying again.
                  </Text>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onFailedMoveClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default TabletopCanvas;
