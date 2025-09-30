import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Button,
  Text,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Spinner,
  Select,
  useDisclosure,
  Tag,
  Tooltip,
  useBreakpointValue,
  Switch,
  FormControl,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';

import { FiMapPin, FiTag, FiCopy } from 'react-icons/fi';
import CardImage from './CardImage';
import SetCardInstanceLocationsModal from './SetCardInstanceLocationsModal';
import LocationDisplayBadge from './LocationDisplayBadge';
import CardDetailModal from './CardDetailModal';
import CardTags from './CardTags';
import { CARD_EVENTS, dispatchCardUpdate } from '@/utils/cardEvents';
import { getTagStyles } from '@/utils/cardStyles';
import { TAG_DEFINITIONS, getTagOptions } from '@/utils/tagDefinitions';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to truncate text
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Helper function to ensure tags are arrays (fixes CardTags mapping error)
const ensureTagsAreArrays = (card) => {
  if (!card) return card;

  const parsePostgreSQLArray = (pgArray) => {
    if (Array.isArray(pgArray)) return pgArray;
    if (!pgArray || pgArray === 'null' || pgArray === null || pgArray === undefined) return [];

    // Parse PostgreSQL array format like "{favorite,want}" -> ["favorite", "want"]
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

  // Convert location_name/location_id to location object (same as CardDetailModal and CardSearch)
  if (card.location_name !== null && card.location_id !== null) {
    processedCard.location = {
      id: card.location_id,
      name: card.location_name,
      marker: card.location_marker || 'gray'
    };
  } else if (card.location && typeof card.location === 'object') {
    // Location is already an object, keep it as is
    processedCard.location = card.location;
  } else {
    processedCard.location = null; // Explicitly set to null when no location
  }

  return processedCard;
};

// LocationSelector component similar to TabletopCanvas
const LocationSelector = ({ selectedLocationId, onLocationSelect }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${api}/api/locations`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (loading) {
    return <Text>Loading locations...</Text>;
  }

  const selectValue = selectedLocationId === null ? "REMOVE" :
                     selectedLocationId === undefined ? "" :
                     selectedLocationId.toString();

  return (
    <Select
      placeholder="Select a location"
      value={selectValue}
      onChange={(e) => {
        const value = e.target.value;
        if (value === "REMOVE") {
          onLocationSelect(null);
        } else if (value === "") {
          onLocationSelect(undefined);
        } else {
          onLocationSelect(parseInt(value));
        }
      }}
    >
      <option value="REMOVE">Remove from location</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name} ({location.type})
        </option>
      ))}
    </Select>
  );
};

// TagSelector component for bulk tag operations
const TagSelector = ({ selectedTagType, selectedTagAction, onTagTypeSelect, onTagActionSelect }) => {
  const tagOptions = getTagOptions();

  return (
    <VStack spacing={3} align="stretch">
      <FormControl>
        <FormLabel fontSize="sm">Tag Type</FormLabel>
        <Select
          placeholder="Select a tag"
          value={selectedTagType}
          onChange={(e) => onTagTypeSelect(e.target.value)}
        >
          {tagOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Action</FormLabel>
        <Select
          placeholder="Select an action"
          value={selectedTagAction}
          onChange={(e) => onTagActionSelect(e.target.value)}
          isDisabled={!selectedTagType}
        >
          <option value="add">Add Tag</option>
          <option value="remove">Remove Tag</option>
        </Select>
      </FormControl>
    </VStack>
  );
};

// Mobile card component for small screens
const MobileCardRow = ({ row, needMoreCards, onLocationChange, isIncomplete }) => {
  return (
    <Box
      bg={isIncomplete ? 'red.50' : (row.isAlternative ? 'yellow.50' : 'white')}
      borderRadius="md"
      border="1px"
      borderColor={isIncomplete ? 'red.200' : (row.isAlternative ? 'yellow.200' : 'gray.200')}
      p={3}
      mb={2}
      boxShadow="sm"
      cursor="pointer"
      onClick={() => onCardClick(row.card)}
      _hover={{
        boxShadow: 'md',
        transform: 'translateY(-1px)'
      }}
      transition="all 0.2s"
    >
      <HStack spacing={3} align="start">
        {/* Card Image */}
        <Box flexShrink={0}>
          <CardImage
            card={row.card}
            src={row.card.img_url}
            alt={row.card.name}
            width="60px"
            height="84px"
            objectFit="cover"
            fallbackSrc="/placeholder.png"
          />
        </Box>

        {/* Card Details */}
        <VStack align="start" spacing={2} flex={1} minW={0}>
          {/* Card Name and Code */}
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
              {row.card.name}
            </Text>
            <HStack spacing={2}>
              <Tag
                size="sm"
                {...getTagStyles(row.card.color)}
                fontWeight="bold"
                fontSize="sm"
                px={3}
                py={1}
              >
                {row.card.card_code}
              </Tag>
              {row.isAlternative && (
                <Text fontSize="xs" color="orange.600" fontStyle="italic">
                  Alternative ({row.card.id})
                </Text>
              )}
            </HStack>
          </VStack>

          {/* Tags Row */}
          <HStack spacing={2}>
            <CardTags
              cardId={row.card.id}
              card={row.card}
              interactive={false}
              size="sm"
              showTooltips={false}
            />
          </HStack>

          {/* Counts Row */}
          <HStack spacing={4} justify="space-between" w="100%">
            <VStack align="center" spacing={0}>
              <Text fontSize="xs" color="gray.500">Deck</Text>
              <Text fontSize="sm" fontWeight="bold" color={isIncomplete ? "red.600" : "black"}>
                {row.deckCount}
              </Text>
            </VStack>
            <VStack align="center" spacing={0}>
              <Text fontSize="xs" color="gray.500">Own</Text>
              <Text fontSize="sm" fontWeight={needMoreCards ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                {row.ownedCount}
              </Text>
            </VStack>
            <VStack align="center" spacing={0}>
              <Text fontSize="xs" color="gray.500">Proxy</Text>
              <Text fontSize="sm" fontWeight={row.proxyCount > 0 ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                {row.proxyCount}
              </Text>
            </VStack>
          </HStack>

          {/* Location */}
          <Box mt={2} onClick={(e) => e.stopPropagation()}>
            {typeof row.location === 'string' && (row.location === 'Loading...' || row.location === 'Not Owned') ? (
              <Text fontSize="xs" color="gray.500">
                {row.location}
              </Text>
            ) : (
              <LocationDisplayBadge
                card={row.card}
                onClick={onLocationChange}
              />
            )}
          </Box>
        </VStack>
      </HStack>
    </Box>
  );
};

const LocateModal = ({ isOpen, onClose, deck }) => {
  const [locateData, setLocateData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [hideComplete, setHideComplete] = useState(false);

  // Bulk action states
  const [bulkLocationId, setBulkLocationId] = useState(undefined);
  const [bulkTagType, setBulkTagType] = useState('');
  const [bulkTagAction, setBulkTagAction] = useState('');
  const [isBulkActionOngoing, setIsBulkActionOngoing] = useState(false);
  const [bulkMoveErrors, setBulkMoveErrors] = useState([]);

  const toast = useToast();

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const modalSize = useBreakpointValue({ base: "full", md: "6xl" });

  // Location modal controls
  const {
    isOpen: isLocationModalOpen,
    onOpen: onLocationModalOpen,
    onClose: onLocationModalClose
  } = useDisclosure();

  // Bulk Actions confirmation dialogs
  const {
    isOpen: isBulkMoveModalOpen,
    onOpen: onBulkMoveModalOpen,
    onClose: onBulkMoveModalClose
  } = useDisclosure();

  const {
    isOpen: isBulkTagModalOpen,
    onOpen: onBulkTagModalOpen,
    onClose: onBulkTagModalClose
  } = useDisclosure();

  // CardDetailModal controls
  const {
    isOpen: isCardDetailModalOpen,
    onOpen: onCardDetailModalOpen,
    onClose: onCardDetailModalClose
  } = useDisclosure();

  const {
    isOpen: isBulkMoveErrorOpen,
    onOpen: onBulkMoveErrorOpen,
    onClose: onBulkMoveErrorClose
  } = useDisclosure();

  const handleOpenLocationModal = (card) => {
    setSelectedCard(card);
    // Don't close error dialog - keep it open so user can process all cards
    onLocationModalOpen();
  };

  // Handle card click to open CardDetailModal
  const handleCardClick = useCallback((card) => {
    setSelectedCard(ensureTagsAreArrays(card));
    onCardDetailModalOpen();
  }, [onCardDetailModalOpen]);

  const cancelRef = React.useRef();

  // Helper function to safely get card data from item (same as DeckBuilder)
  const getCardData = useCallback((item) => {
    if (!item) return null;
    // Handle both structures: { card: {...}, count } or { id, name, ..., count }
    return item.card || item;
  }, []);

  // Helper function to extract base card ID by removing _p suffix
  const getBaseCardId = (cardId) => {
    return cardId.replace(/_p\d+$/, '');
  };

  // Helper function to check if a card has alternative versions (_p suffix)
  const isAlternativeCard = (cardId) => {
    return /_p\d+$/.test(cardId);
  };

  // Helper function to prioritize cards with _p suffix
  const prioritizeAlternatives = (cards) => {
    return cards.sort((a, b) => {
      const aIsAlt = isAlternativeCard(a.id);
      const bIsAlt = isAlternativeCard(b.id);
      if (aIsAlt && !bIsAlt) return -1;
      if (!aIsAlt && bIsAlt) return 1;
      return a.id.localeCompare(b.id);
    });
  };

  // Filter data based on hideComplete setting
  useEffect(() => {
    if (!hideComplete) {
      setFilteredData(locateData);
    } else {
      // Group cards by their original deck card requirement (base card_code)
      const cardGroups = {};

      locateData.forEach(row => {
        // Get the original deck card requirement info
        const baseKey = row.isAlternative ?
          locateData.find(r => !r.isAlternative && r.card.card_code === row.card.card_code)?.cardId || row.card.card_code :
          row.cardId;

        if (!cardGroups[baseKey]) {
          cardGroups[baseKey] = {
            totalOwned: 0,
            deckCount: 0,
            rows: []
          };
        }

        cardGroups[baseKey].totalOwned += (parseInt(row.ownedCount, 10) || 0) + (parseInt(row.proxyCount, 10) || 0);
        cardGroups[baseKey].deckCount = Math.max(cardGroups[baseKey].deckCount, row.deckCount || 0);
        cardGroups[baseKey].rows.push(row);
      });

      // Filter to show only incomplete groups
      const incompleteRows = [];
      Object.values(cardGroups).forEach(group => {
        if (group.totalOwned < group.deckCount) {
          incompleteRows.push(...group.rows);
        }
      });

      setFilteredData(incompleteRows);
    }
  }, [locateData, hideComplete]);

  // Helper function to check if a card group is incomplete
  const isCardGroupIncomplete = useCallback((row) => {
    if (!row) return false;

    // Build card groups like in the filter effect
    const cardGroups = {};
    locateData.forEach(r => {
      const baseKey = r.isAlternative ?
        locateData.find(baseRow => !baseRow.isAlternative && baseRow.card.card_code === r.card.card_code)?.cardId || r.card.card_code :
        r.cardId;

      if (!cardGroups[baseKey]) {
        cardGroups[baseKey] = { totalOwned: 0, deckCount: 0 };
      }

      cardGroups[baseKey].totalOwned += (parseInt(r.ownedCount, 10) || 0) + (parseInt(r.proxyCount, 10) || 0);
      cardGroups[baseKey].deckCount = Math.max(cardGroups[baseKey].deckCount, r.deckCount || 0);
    });

    // Check if current row's group is incomplete
    const currentRowBaseKey = row.isAlternative ?
      locateData.find(r => !r.isAlternative && r.card.card_code === row.card.card_code)?.cardId || row.card.card_code :
      row.cardId;

    const group = cardGroups[currentRowBaseKey];
    return group ? group.totalOwned < group.deckCount : true;
  }, [locateData]);

  // Fetch available locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${api}/api/locations`, {
        credentials: 'include',
      });

      if (response.ok) {
        const locationData = await response.json();
        setLocations(locationData);
      }
    } catch (error) {
      console.warn('Failed to fetch locations:', error);
    }
  }, []);

  const generateLocateData = useCallback(async () => {
    if (!deck || !deck.cards || deck.cards.length === 0) {
      setLocateData([]);
      return;
    }

    setIsLoading(true);
    setLocateData([]);

    try {
      const finalRows = [];

      // Process each deck card individually
      for (const deckItem of deck.cards) {
        const deckCardData = getCardData(deckItem);
        if (!deckCardData || !deckCardData.id) continue;

        const deckCardId = deckCardData.id;
        const deckCardCode = deckCardData.card_code;
        const deckCount = deckItem.count || 1;

        // Step 1: Search for exact card ID match
        let exactCard = null;
        try {
          const exactSearchParams = new URLSearchParams({
            keyword: `id:${deckCardId}`,
            ownedOnly: 'false',
            showProxies: 'true'
          });

          const exactResponse = await fetch(`${api}/api/cards/search?${exactSearchParams.toString()}`, {
            credentials: 'include',
          });

          if (exactResponse.ok) {
            const exactResults = await exactResponse.json();
            const exactSearchResults = Array.isArray(exactResults) ?
              exactResults : exactResults.results || [];

            if (exactSearchResults.length > 0) {
              exactCard = ensureTagsAreArrays(exactSearchResults[0]);
            }
          }
        } catch (error) {
          console.warn(`Failed to search for exact card ${deckCardId}:`, error);
        }

        // Step 2: Check if exact match has enough cards
        const exactOwnedCount = exactCard?.owned_count || 0;
        const exactProxyCount = exactCard?.proxy_count || 0;
        const exactTotalOwned = exactOwnedCount + exactProxyCount;

        // Add exact match row (always show it)
        if (exactCard) {
          let location = 'Not Owned';
          if (exactTotalOwned > 0) {
            if (exactCard.location?.name || (exactCard.location_name && exactCard.location_id)) {
              const locationData = exactCard.location || {
                id: exactCard.location_id,
                name: exactCard.location_name,
                marker: exactCard.location_marker || 'gray'
              };
              location = locationData.name;
              exactCard.location = locationData;
            } else {
              location = 'Set Location';
            }
          }

          const exactRowData = {
            cardId: exactCard.id,
            card: exactCard,
            deckCount,
            ownedCount: exactOwnedCount,
            proxyCount: exactProxyCount,
            location,
            isAlternative: false,
            displayCardId: exactCard.id // Normal display for exact match
          };

          finalRows.push(exactRowData);
        } else {
          // No exact card found, create placeholder
          const processedDeckCard = ensureTagsAreArrays(deckCardData);
          const placeholderRowData = {
            cardId: deckCardId,
            card: processedDeckCard,
            deckCount,
            ownedCount: 0,
            proxyCount: 0,
            location: 'Not Owned',
            isAlternative: false,
            displayCardId: deckCardId
          };

          finalRows.push(placeholderRowData);
        }

        // Step 3: If exact match doesn't have enough cards, search for alternatives
        if (exactTotalOwned < deckCount) {
          try {
            const altSearchParams = new URLSearchParams({
              keyword: deckCardCode,
              ownedOnly: 'false',
              showProxies: 'true'
            });

            const altResponse = await fetch(`${api}/api/cards/search?${altSearchParams.toString()}`, {
              credentials: 'include',
            });

            if (altResponse.ok) {
              const altResults = await altResponse.json();
              const altSearchResults = Array.isArray(altResults) ?
                altResults : altResults.results || [];

              if (altSearchResults.length > 0) {
                // Filter for alternatives with same card_code but different card_id
                const alternatives = altSearchResults.filter(card =>
                  card.card_code === deckCardCode &&
                    card.id !== deckCardId &&
                    ((card.owned_count || 0) > 0 || (card.proxy_count || 0) > 0)
                );

                if (alternatives.length > 0) {
                  // Sort alternatives by total owned count (highest first)
                  const sortedAlternatives = alternatives.sort((a, b) => {
                    const aTotalOwned = (a.owned_count || 0) + (a.proxy_count || 0);
                    const bTotalOwned = (b.owned_count || 0) + (b.proxy_count || 0);
                    return bTotalOwned - aTotalOwned;
                  });

                  // Calculate how many more cards we need
                  const remainingNeeded = deckCount - exactTotalOwned;
                  let remainingToAdd = remainingNeeded;

                  // Add alternatives until we have enough or run out
                  for (const altCard of sortedAlternatives) {
                    if (remainingToAdd <= 0) break;

                    const processedAltCard = ensureTagsAreArrays(altCard);
                    const altOwnedCount = processedAltCard.owned_count || 0;
                    const altProxyCount = processedAltCard.proxy_count || 0;
                    const altTotalOwned = altOwnedCount + altProxyCount;

                    if (altTotalOwned > 0) {
                      let location = 'Not Owned';
                      if (altTotalOwned > 0) {
                        if (processedAltCard.location?.name || (processedAltCard.location_name && processedAltCard.location_id)) {
                          const locationData = processedAltCard.location || {
                            id: processedAltCard.location_id,
                            name: processedAltCard.location_name,
                            marker: processedAltCard.location_marker || 'gray'
                          };
                          location = locationData.name;
                          processedAltCard.location = locationData;
                        } else {
                          location = 'Set Location';
                        }
                      }

                      const altRowData = {
                        cardId: processedAltCard.id,
                        card: processedAltCard,
                        deckCount: Math.min(remainingToAdd, altTotalOwned), // Show how many we can use from this alternative
                        ownedCount: altOwnedCount,
                        proxyCount: altProxyCount,
                        location,
                        isAlternative: true,
                        displayCardId: `*${processedAltCard.id}` // Add * prefix for alternatives
                      };

                      finalRows.push(altRowData);

                      // Reduce the remaining needed count
                      remainingToAdd -= Math.min(remainingToAdd, altTotalOwned);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to search for alternatives of card ${deckCardCode}:`, error);
          }
        }

        // Small delay between cards to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setLocateData(finalRows);

    } catch (error) {
      console.error('Error generating locate data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load card location data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [deck, getCardData, toast]);

  // Handle location change
  const handleLocationChange = (card) => {
    setSelectedCard(card);
    onLocationModalOpen();
  };

  // Handle location update with global dispatch
  const handleLocationUpdate = async () => {
    if (!selectedCard) {
      onLocationModalClose();
      return;
    }

    try {
      // Fetch only the updated card's data
      const searchParams = new URLSearchParams({
        keyword: `id:${selectedCard.id}`,
        ownedOnly: 'false',
        showProxies: 'true'
      });

      const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const searchData = await response.json();
        const searchResults = Array.isArray(searchData) ? searchData : searchData.results || [];

        if (searchResults.length > 0) {
          const updatedCard = ensureTagsAreArrays(searchResults[0]);

          // Update the locate data for this specific card
          setLocateData(prevData => {
            return prevData.map(row => {
              if (row.cardId === updatedCard.id) {
                return {
                  ...row,
                  card: updatedCard,
                  ownedCount: updatedCard.owned_count || 0,
                  proxyCount: updatedCard.proxy_count || 0
                };
              }
              return row;
            });
          });

          // Dispatch global update event for other components
          dispatchCardUpdate(CARD_EVENTS.LOCATION_UPDATED, updatedCard.id, { card: updatedCard });

          toast({
            title: 'Location Updated',
            description: `Card locations updated successfully`,
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching updated card data:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh card data',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
    // Don't close the modal - let the user close it manually
  };

  const handleLocationUpdateAndReopenErrors = async () => {
    await handleLocationUpdate();
    // If there were bulk move errors, reopen the dialog after location modal closes
    if (bulkMoveErrors.length > 0) {
      // Small delay to ensure location modal is closed first
      setTimeout(() => {
        onBulkMoveErrorOpen();
      }, 100);
    }
  };

  // Handle bulk move location
  const handleBulkMove = async () => {
    if (bulkLocationId === undefined) {
      toast({
        title: 'No Location Selected',
        description: 'Please select a location first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsBulkActionOngoing(true);

    try {
      const ownedCards = filteredData.filter(row => {
        const totalOwned = (row.ownedCount || 0) + (row.proxyCount || 0);
        return totalOwned > 0;
      });

      if (ownedCards.length === 0) {
        toast({
          title: 'No Cards to Move',
          description: 'No owned cards found to move',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        setIsBulkActionOngoing(false);
        return;
      }

      const errorList = [];
      const successList = [];

      // Process each card
      for (const row of ownedCards) {
        try {
          const cardId = row.cardId;
          const deckCount = row.deckCount || 1;
          const totalOwned = (row.ownedCount || 0) + (row.proxyCount || 0);

          // Determine the number of cards to move
          // For incomplete cards (totalOwned < deckCount), use totalOwned (max owned)
          // For complete cards (totalOwned >= deckCount), use deckCount
          const cardsToMove = totalOwned < deckCount ? totalOwned : deckCount;

          // Fetch instances for this card
          const instancesResponse = await fetch(`${api}/api/cards/${cardId}/instances`, {
            credentials: 'include'
          });

          if (!instancesResponse.ok) {
            throw new Error('Failed to fetch card instances');
          }

          const instancesData = await instancesResponse.json();
          const instances = instancesData.instances || [];

          // Condition 1: If cardsToMove matches total owned (move all available cards)
          // This handles:
          // - Complete cards where cardsToMove === instances (deck needs 4, own 4)
          // - Incomplete cards where cardsToMove === instances (deck needs 4, own 2)
          if (cardsToMove === instances.length) {
            const updates = instances.map(inst => ({
              instance_id: inst.instance_id,
              location_id: bulkLocationId
            }));

            const updateResponse = await fetch(`${api}/api/cards/${cardId}/instances/locations`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ updates })
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update locations');
            }

            successList.push({
              cardName: row.card.name,
              cardCode: row.card.card_code,
              movedCount: instances.length
            });
          }
          // Condition 2: If cardsToMove < total owned, prioritize unlocated cards
          else if (cardsToMove < instances.length) {
            // Separate unlocated and located instances
            const unlocatedInstances = instances.filter(inst => !inst.location_id);
            const locatedInstances = instances.filter(inst => inst.location_id);

            // Count instances already in target location
            const alreadyInTargetLocation = instances.filter(inst =>
              inst.location_id === bulkLocationId
            );

            // Condition 3a: Check if already satisfied (skip if cards are already in target location)
            if (cardsToMove > unlocatedInstances.length &&
              alreadyInTargetLocation.length === cardsToMove) {
              // Already have exact number needed in target location - skip
              successList.push({
                cardName: row.card.name,
                cardCode: row.card.card_code,
                movedCount: 0,
                skipped: true
              });
              continue;
            }

            // Condition 3b: If cardsToMove > unlocated count and not already satisfied, error
            if (cardsToMove > unlocatedInstances.length) {
              errorList.push({
                cardName: row.card.name,
                cardCode: row.card.card_code,
                cardId: row.cardId,
                card: row.card,
                cardsToMove: cardsToMove,
                deckCount: deckCount,
                totalOwned: totalOwned,
                unlocatedCount: unlocatedInstances.length,
                locatedCount: locatedInstances.length,
                reason: `Need ${cardsToMove} but only ${unlocatedInstances.length} unlocated (${locatedInstances.length} already located)`
              });
              continue;
            }

            // Take only the needed number of unlocated instances
            const instancesToMove = unlocatedInstances.slice(0, cardsToMove);
            const updates = instancesToMove.map(inst => ({
              instance_id: inst.instance_id,
              location_id: bulkLocationId
            }));

            const updateResponse = await fetch(`${api}/api/cards/${cardId}/instances/locations`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ updates })
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update locations');
            }

            successList.push({
              cardName: row.card.name,
              cardCode: row.card.card_code,
              movedCount: instancesToMove.length
            });
          }
          // Condition 3: If cardsToMove === total owned (but less than instances.length somehow - shouldn't happen but handle it)
          else {
            // This case handles edge scenarios - move all instances up to cardsToMove
            const instancesToMove = instances.slice(0, cardsToMove);
            const updates = instancesToMove.map(inst => ({
              instance_id: inst.instance_id,
              location_id: bulkLocationId
            }));

            const updateResponse = await fetch(`${api}/api/cards/${cardId}/instances/locations`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ updates })
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update locations');
            }

            successList.push({
              cardName: row.card.name,
              cardCode: row.card.card_code,
              movedCount: instancesToMove.length
            });
          }

        } catch (error) {
          console.error(`Error processing card ${row.cardId}:`, error);
          errorList.push({
            cardName: row.card.name,
            cardCode: row.card.card_code,
            cardId: row.cardId,
            card: row.card,
            reason: error.message || 'Update failed'
          });
        }
      }

      // Show results
      if (successList.length > 0) {
        // Refresh the locate data to show updated locations
        await generateLocateData();

        const selectedLocationData = bulkLocationId === null ? null :
          locations.find(loc => loc.id === bulkLocationId);
        const locationName = selectedLocationData?.name || 'removed from location';

        const movedCount = successList.filter(s => !s.skipped).length;
        const skippedCount = successList.filter(s => s.skipped).length;

        let description = '';
        if (movedCount > 0 && skippedCount > 0) {
          description = `Moved ${movedCount} card(s) to ${locationName}, ${skippedCount} card(s) already in location`;
        } else if (movedCount > 0) {
          description = `Successfully moved ${movedCount} card(s) to ${locationName}`;
        } else {
          description = `${skippedCount} card(s) already in ${locationName}`;
        }

        toast({
          title: 'Bulk Move Complete',
          description,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } else if (errorList.length === 0) {
        // No successes and no errors means no cards to move
        toast({
          title: 'No Cards to Move',
          description: 'No cards in the selection could be moved',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }

      if (errorList.length > 0) {
        // Store error list in state to show in dialog
        setBulkMoveErrors(errorList);
        onBulkMoveErrorOpen();
      }

      setBulkLocationId(undefined);
      onBulkMoveModalClose();

    } catch (error) {
      console.error('Critical error in bulk move:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete bulk move operation',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsBulkActionOngoing(false);
    }
  };

  // Handle bulk tag operations
  const handleBulkTag = async () => {
    if (!bulkTagType || !bulkTagAction) {
      toast({
        title: 'Tag Selection Required',
        description: 'Please select both a tag type and action',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsBulkActionOngoing(true);
    try {
      // Allow tagging for all cards in filtered data, not just owned cards
      const cardsToTag = filteredData;

      if (cardsToTag.length === 0) {
        toast({
          title: 'No Cards to Tag',
          description: 'No cards found to update tags for',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const tagPromises = cardsToTag.map(async (row) => {
        const response = await fetch(`${api}/api/cards/${encodeURIComponent(row.cardId)}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tagType: bulkTagType,
            action: bulkTagAction
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update tag for card ${row.cardId}`);
        }

        return { cardId: row.cardId };
      });

      await Promise.all(tagPromises);

      // Update locate data and dispatch global updates
      setLocateData(prevData => {
        return prevData.map(row => {
          const isAffectedCard = cardsToTag.some(cardRow => cardRow.cardId === row.cardId);
          if (isAffectedCard) {
            // Update the card's tags properly
            const currentUserTags = Array.isArray(row.card.user_tags) ? row.card.user_tags : [];
            let newUserTags;

            if (bulkTagAction === 'add') {
              if (!currentUserTags.includes(bulkTagType)) {
                newUserTags = [...currentUserTags, bulkTagType];
              } else {
                newUserTags = currentUserTags;
              }
            } else {
              newUserTags = currentUserTags.filter(tag => tag !== bulkTagType);
            }

            // Create properly formatted updated card data
            const updatedCard = {
              ...row.card,
              user_tags: newUserTags,
              // Also update the string format that the API might return
              user_tags_string: newUserTags.length > 0 ? `{${newUserTags.join(',')}}` : '{}'
            };

            // Dispatch global update for each affected card with complete card data
            dispatchCardUpdate(CARD_EVENTS.TAG_UPDATED, row.cardId, { card: updatedCard });

            return {
              ...row,
              card: updatedCard
            };
          }
          return row;
        });
      });

      const actionText = bulkTagAction === 'add' ? 'Added' : 'Removed';
      const tagLabel = TAG_DEFINITIONS[bulkTagType]?.label || bulkTagType;

      toast({
        title: 'Tags Updated',
        description: `${actionText} "${tagLabel}" tag for ${cardsToTag.length} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setBulkTagType('');
      setBulkTagAction('');
      onBulkTagModalClose();

    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card tags. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsBulkActionOngoing(false);
    }
  };

  // Handle copy card list (similar to TabletopCanvas)
  const handleCopyCardList = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: 'No cards to copy',
        description: 'No cards found to copy to clipboard',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Sort by card_code for consistent ordering
    const sortedCards = [...filteredData].sort((a, b) =>
      (a.card.card_code || '').localeCompare(b.card.card_code || '')
    );

    // Generate card list in format: "4xOP10-001" (using deckCount)
    const cardTexts = sortedCards
      .filter(row => row.card.card_code) // Only include cards with valid card codes
      .map(row => `${row.deckCount}x${row.card.card_code}`);

    if (cardTexts.length === 0) {
      toast({
        title: 'No valid cards',
        description: 'No cards with valid card codes found',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const fullText = cardTexts.join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(fullText).then(() => {
      toast({
        title: 'Card list copied!',
        description: `Copied ${cardTexts.length} cards to clipboard`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }).catch(() => {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy card list to clipboard',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    });
  }, [filteredData, toast]);

  // Initialize data and locations when modal opens
  useEffect(() => {
    if (isOpen) {
      generateLocateData();
      fetchLocations();
    }
  }, [isOpen, generateLocateData, fetchLocations]);

  // Listen for location updates from other components (CardDetailModal, etc.)
  useEffect(() => {
    if (!isOpen) return;

    const handleLocationUpdate = (event) => {
      const { cardId, card: updatedCard } = event.detail;

      if (!cardId || !updatedCard) return;

      setLocateData(prevData => {
        const hasCard = prevData.some(row => row.cardId === cardId);
        if (!hasCard) return prevData;

        return prevData.map(row => {
          if (row.cardId === cardId) {
            const ownedCount = updatedCard.owned_count || 0;
            const proxyCount = updatedCard.proxy_count || 0;

            let location = 'Not Owned';
            if (ownedCount > 0 || proxyCount > 0) {
              if (updatedCard.location && updatedCard.location.name) {
                location = updatedCard.location.name;
              } else {
                location = 'Set Location';
              }
            }

            return {
              ...row,
              card: updatedCard,
              ownedCount,
              proxyCount,
              location
            };
          }
          return row;
        });
      });
    };

    window.addEventListener(CARD_EVENTS.LOCATION_UPDATED, handleLocationUpdate);
    window.addEventListener(CARD_EVENTS.COUNT_UPDATED, handleLocationUpdate);

    return () => {
      window.removeEventListener(CARD_EVENTS.LOCATION_UPDATED, handleLocationUpdate);
      window.removeEventListener(CARD_EVENTS.COUNT_UPDATED, handleLocationUpdate);
    };
  }, [isOpen]);

  return (
    <>
      <Modal isOpen={isOpen && !isCardDetailModalOpen} onClose={onClose} size={modalSize} scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <Text>Locate Deck Cards</Text>
              <Text fontSize="sm" color="gray.600">
                Track your physical cards and their locations
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody p={0} maxH="60vh" overflowY="auto">
            {isLoading && locateData.length === 0 ? (
              <VStack py={8}>
                <Spinner size="xl" />
                <Text>Loading card location data...</Text>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {filteredData.length === 0 ? (
                  <Text textAlign="center" color="gray.500" py={8}>
                    {locateData.length === 0 ? 'No cards found in deck' : 'All cards are complete'}
                  </Text>
                ) : isMobile ? (
                  // Mobile View - Card Layout
                  <Box>
                    {filteredData.map((row, index) => {
                      const totalOwnedCards = (row.ownedCount || 0) + (row.proxyCount || 0);
                      const deckCount = row.deckCount || 0;
                      const needMoreCards = deckCount > totalOwnedCards;
                      const isIncomplete = isCardGroupIncomplete(row);

                      return (
                        <MobileCardRow
                          key={`${row.cardId}-${index}`}
                          row={row}
                          needMoreCards={needMoreCards}
                          isIncomplete={isIncomplete}
                          onLocationChange={handleLocationChange}
                          onCardClick={handleCardClick}
                        />
                      );
                    })}
                  </Box>
                ) : (
                  // Desktop View - Table Layout
                  <Box
                    border="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    overflow="hidden"
                  >
                    <Table size="sm" variant="simple">
                      <Thead position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <Tr>
                          <Th width="80px">Card</Th>
                          <Th>Name</Th>
                          <Th width="80px">Tags</Th>
                          <Th width="60px">Deck</Th>
                          <Th width="60px">Own</Th>
                          <Th width="60px">Proxy</Th>
                          <Th width="150px">Location</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredData.map((row, index) => {
                          // Calculate total owned cards (owned + proxy)
                          const totalOwnedCards = (row.ownedCount || 0) + (row.proxyCount || 0);
                          const deckCount = row.deckCount || 0;
                          const needMoreCards = deckCount > totalOwnedCards;
                          const isIncomplete = isCardGroupIncomplete(row);

                          return (
                            <Tr
                              key={`${row.cardId}-${index}`}
                              bg={isIncomplete ? 'red.50' : (row.isAlternative ? 'yellow.50' : 'white')}
                              cursor="pointer"
                              onClick={() => handleCardClick(row.card)}
                              _hover={{
                                bg: isIncomplete ? 'red.100' : (row.isAlternative ? 'yellow.100' : 'gray.50')
                              }}
                              transition="all 0.2s"
                            >
                              {/* Card Image */}
                              <Td p={2}>
                                <CardImage
                                  card={row.card}
                                  src={row.card.img_url}
                                  alt={row.card.name}
                                  width="50px"
                                  height="70px"
                                  objectFit="cover"
                                  fallbackSrc="/placeholder.png"
                                />
                              </Td>

                              {/* Card Name */}
                              <Td>
                                <VStack align="start" spacing={1}>
                                  <HStack spacing={2}>
                                    <Tag
                                      size="sm"
                                      {...getTagStyles(row.card.color)}
                                      fontWeight="bold"
                                      fontSize="xs"
                                      px={2}
                                      py={1}
                                    >
                                      {row.card.card_code}
                                    </Tag>
                                    {row.isAlternative && (
                                      <Text fontSize="xs" color="orange.600" fontStyle="italic">
                                        Alt
                                      </Text>
                                    )}
                                  </HStack>
                                  <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                                    {row.card.name}
                                  </Text>
                                </VStack>
                              </Td>

                              {/* User Tags Column */}
                              <Td>
                                <CardTags
                                  cardId={row.card.id}
                                  card={row.card}
                                  interactive={false}
                                  size="sm"
                                  showTooltips={false}
                                />
                              </Td>

                              {/* Deck Count */}
                              <Td textAlign="center">
                                <Text fontWeight="bold" color={isIncomplete ? "red.600" : "black"}>
                                  {row.deckCount}
                                </Text>
                              </Td>

                              {/* Owned Count */}
                              <Td textAlign="center">
                                <Text fontWeight={needMoreCards ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                                  {row.ownedCount}
                                </Text>
                              </Td>

                              {/* Proxy Count */}
                              <Td textAlign="center">
                                <Text fontWeight={row.proxyCount > 0 ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                                  {row.proxyCount}
                                </Text>
                              </Td>

                              {/* Location */}
                              <Td onClick={(e) => e.stopPropagation()}>
                                {typeof row.location === 'string' && (row.location === 'Loading...' || row.location === 'Not Owned') ? (
                                  <Text fontSize="xs" color="gray.500">
                                    {row.location}
                                  </Text>
                                ) : (
                                  <LocationDisplayBadge
                                    card={row.card}
                                    onClick={handleLocationChange}
                                  />
                                )}
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack justify="space-between" align="center" w="100%">
              {/* Left side - Hide Complete Switch */}
              <FormControl display="flex" alignItems="center" width="auto">
                <FormLabel htmlFor="hide-complete" mb="0" fontSize="sm">
                  Hide Complete
                </FormLabel>
                <Switch
                  id="hide-complete"
                  isChecked={hideComplete}
                  onChange={(e) => setHideComplete(e.target.checked)}
                />
              </FormControl>

              {/* Right side - Bulk Actions and Close */}
              <HStack spacing={3}>
                {/* Bulk Actions Menu - moved from header */}
                <Menu>
                  <MenuButton
                    as={Button}
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    isDisabled={isBulkActionOngoing}
                  >
                    Bulk Actions
                  </MenuButton>
                  <MenuList>
                    <MenuItem icon={<FiMapPin />} onClick={onBulkMoveModalOpen}>
                      Move to Location
                    </MenuItem>
                    <MenuItem icon={<FiTag />} onClick={onBulkTagModalOpen}>
                      Set Tag
                    </MenuItem>
                    <MenuItem icon={<FiCopy />} onClick={handleCopyCardList}>
                      Copy Card List
                    </MenuItem>
                  </MenuList>
                </Menu>

                <Button onClick={onClose}>Close</Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Set Location Modal */}
      {selectedCard && (
        <SetCardInstanceLocationsModal
          isOpen={isLocationModalOpen}
          onClose={onLocationModalClose}
          card={selectedCard}
          onLocationUpdated={bulkMoveErrors.length > 0 ? handleLocationUpdateAndReopenErrors : handleLocationUpdate}
        />
      )}

      {/* Bulk Move Modal */}
      <Modal isOpen={isBulkMoveModalOpen} onClose={onBulkMoveModalClose} size="lg" closeOnOverlayClick={!isBulkActionOngoing}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiMapPin />
              <Text>Move Cards to Location</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton isDisabled={isBulkActionOngoing} />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Move all owned cards to a new location. Only cards you own will be moved.
              </Text>
              {isBulkActionOngoing && (
                <VStack spacing={2}>
                  <Spinner size="md" color="blue.500" />
                  <Text fontSize="sm" color="blue.600">
                    Moving cards, please wait...
                  </Text>
                </VStack>
              )}
              <LocationSelector
                selectedLocationId={bulkLocationId}
                onLocationSelect={setBulkLocationId}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={onBulkMoveModalClose}
                isDisabled={isBulkActionOngoing}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleBulkMove}
                isDisabled={bulkLocationId === undefined || isBulkActionOngoing}
                isLoading={isBulkActionOngoing}
                loadingText="Moving..."
              >
                {bulkLocationId === null ? 'Remove from Location' : 'Move Cards'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Tag Modal */}
      <Modal isOpen={isBulkTagModalOpen} onClose={onBulkTagModalClose} size="lg" closeOnOverlayClick={!isBulkActionOngoing}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiTag />
              <Text>Set Tags for Cards</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton isDisabled={isBulkActionOngoing} />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Add or remove tags for all cards shown. Tags can be applied to any card, even if not in your collection.
              </Text>
              {isBulkActionOngoing && (
                <VStack spacing={2}>
                  <Spinner size="md" color="blue.500" />
                  <Text fontSize="sm" color="blue.600">
                    Updating tags, please wait...
                  </Text>
                </VStack>
              )}
              <TagSelector
                selectedTagType={bulkTagType}
                selectedTagAction={bulkTagAction}
                onTagTypeSelect={setBulkTagType}
                onTagActionSelect={setBulkTagAction}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={onBulkTagModalClose}
                isDisabled={isBulkActionOngoing}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleBulkTag}
                isDisabled={!bulkTagType || !bulkTagAction || isBulkActionOngoing}
                isLoading={isBulkActionOngoing}
                loadingText="Updating..."
              >
                {bulkTagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Move Error Dialog */}
      <Modal
        isOpen={isBulkMoveErrorOpen}
        onClose={onBulkMoveErrorClose}
        size="xl"
        scrollBehavior="inside"
        closeOnOverlayClick={false}
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <HStack spacing={2}>
                <FiMapPin />
                <Text>Cards Skipped During Bulk Move</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                {bulkMoveErrors.length} card(s) could not be moved automatically
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box p={3} bg="orange.50" borderRadius="md" borderLeft="4px" borderColor="orange.400">
                <Text fontSize="sm" color="orange.800">
                  <strong>Suggestion:</strong> These cards have instances in multiple locations.
                  You need to manually select which specific instances to move. Click the "Set Location" button
                  for each card to manage their locations individually. This dialog will stay open until you close it.
                </Text>
              </Box>

              <VStack spacing={2} align="stretch">
                {bulkMoveErrors.map((error, index) => (
                  <Box
                    key={index}
                    p={3}
                    bg="white"
                    borderRadius="md"
                    border="1px"
                    borderColor="gray.200"
                    _hover={{ bg: 'gray.50' }}
                  >
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack spacing={2}>
                          <Text fontWeight="bold" fontSize="sm">
                            {error.cardName}
                          </Text>
                          <Tag size="sm" colorScheme="gray">
                            {error.cardCode}
                          </Tag>
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          {error.reason}
                        </Text>
                        {error.cardsToMove && (
                          <HStack spacing={3} fontSize="xs" color="gray.500" mt={1}>
                            <Text>Need: {error.cardsToMove}</Text>
                            {error.unlocatedCount !== undefined && (
                              <Text>Unlocated: {error.unlocatedCount}</Text>
                            )}
                            {error.locatedCount !== undefined && (
                              <Text>Located: {error.locatedCount}</Text>
                            )}
                          </HStack>
                        )}
                      </VStack>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiMapPin />}
                        onClick={() => handleOpenLocationModal(error.card)}
                      >
                        Set Location
                      </Button>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onBulkMoveErrorClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <CardDetailModal
        isOpen={isCardDetailModalOpen}
        onClose={onCardDetailModalClose}
        selectedCard={selectedCard}
        showProxies={true}
        interactive={false}
      />
    </>
  );
};

export default LocateModal;
