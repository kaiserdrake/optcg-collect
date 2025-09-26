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
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Tag,
  Tooltip,
  useBreakpointValue,
  Switch,
  FormControl,
  FormLabel
} from '@chakra-ui/react';

import { FiMapPin } from 'react-icons/fi';
import CardImage from './CardImage';
import SetLocationModal from './SetLocationModal';
import { CARD_EVENTS } from '@/utils/cardEvents';
import { getTagStyles } from '@/utils/cardStyles';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to truncate text
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Interactive location badge component
const InteractiveLocationBadge = ({ card, onLocationChange }) => {
  const handleClick = () => {
    if (onLocationChange) {
      onLocationChange(card);
    }
  };

  const hasLocation = card.location && card.location.name;
  const locationName = hasLocation ? card.location.name : 'Set Location';
  const marker = hasLocation ? card.location.marker || 'gray' : 'gray';

  return (
    <Tooltip label={hasLocation ? `Location: ${locationName}` : 'Click to set location'} placement="top">
      <Tag
        size="sm"
        variant="subtle"
        colorScheme={marker}
        cursor="pointer"
        onClick={handleClick}
        _hover={{
          transform: 'scale(1.05)',
          boxShadow: 'sm'
        }}
        transition="all 0.2s"
      >
        <HStack spacing={1}>
          <FiMapPin size="12" />
          <Text fontSize="xs" fontWeight="medium">
            {truncateText(locationName, 12)}
          </Text>
        </HStack>
      </Tag>
    </Tooltip>
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
          <Box mt={2}>
            {typeof row.location === 'string' && (row.location === 'Loading...' || row.location === 'Not Owned') ? (
              <Text fontSize="xs" color="gray.500">
                {row.location}
              </Text>
            ) : (
              <InteractiveLocationBadge
                card={row.card}
                onLocationChange={onLocationChange}
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
  const [selectedMoveAllLocation, setSelectedMoveAllLocation] = useState('');
  const [isMovingAll, setIsMovingAll] = useState(false);
  const [hideComplete, setHideComplete] = useState(false);

  const toast = useToast();
  const scrollContainerRef = useRef(null);

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const modalSize = useBreakpointValue({ base: "full", md: "6xl" });

  // Location modal controls
  const {
    isOpen: isLocationModalOpen,
    onOpen: onLocationModalOpen,
    onClose: onLocationModalClose
  } = useDisclosure();

  // Move All confirmation dialog
  const {
    isOpen: isMoveAllDialogOpen,
    onOpen: onMoveAllDialogOpen,
    onClose: onMoveAllDialogClose
  } = useDisclosure();

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
          // For alternatives, we need to find the original deck requirement
          locateData.find(r => !r.isAlternative && r.card.card_code === row.card.card_code)?.cardId || row.card.card_code :
          row.cardId;

        if (!cardGroups[baseKey]) {
          cardGroups[baseKey] = {
            deckCount: 0,
            totalOwned: 0,
            rows: []
          };
        }

        // For the original card, use its deck count
        // For alternatives, their deckCount represents remaining needed
        if (!row.isAlternative) {
          cardGroups[baseKey].deckCount = row.deckCount;
        }

        cardGroups[baseKey].totalOwned += (row.ownedCount || 0) + (row.proxyCount || 0);
        cardGroups[baseKey].rows.push(row);
      });

      // Filter out complete groups and flatten back to individual rows
      const filtered = [];
      Object.values(cardGroups).forEach(group => {
        const isComplete = group.totalOwned >= group.deckCount;
        if (!isComplete) {
          filtered.push(...group.rows);
        }
      });

      setFilteredData(filtered);
    }
  }, [locateData, hideComplete]);

  // Helper function to determine if a card group is incomplete
  const isCardGroupIncomplete = useCallback((row) => {
    // Group cards by their original deck card requirement (base card_code)
    const cardGroups = {};

    locateData.forEach(r => {
      // Get the original deck card requirement info
      const baseKey = r.isAlternative ?
        // For alternatives, we need to find the original deck requirement
        locateData.find(orig => !orig.isAlternative && orig.card.card_code === r.card.card_code)?.cardId || r.card.card_code :
        r.cardId;

      if (!cardGroups[baseKey]) {
        cardGroups[baseKey] = {
          deckCount: 0,
          totalOwned: 0,
          rows: []
        };
      }

      // For the original card, use its deck count
      if (!r.isAlternative) {
        cardGroups[baseKey].deckCount = r.deckCount;
      }

      cardGroups[baseKey].totalOwned += (r.ownedCount || 0) + (r.proxyCount || 0);
      cardGroups[baseKey].rows.push(r);
    });

    // Find the group this row belongs to
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

            // Handle both new paginated format and legacy format
            const exactSearchResults = Array.isArray(exactResults) ? exactResults : exactResults.results || [];

            const exactCard = exactSearchResults.find(card => card.id === deckCardId);

            if (exactCard) {
              const exactOwnedCount = exactCard.owned_count || 0;
              const exactProxyCount = exactCard.proxy_count || 0;
              const totalOwnedExact = exactOwnedCount + exactProxyCount;

              // Add the exact match row
              let exactLocation = 'Not Owned';
              if (totalOwnedExact > 0) {
                if (exactCard.location && exactCard.location.name) {
                  exactLocation = exactCard.location.name;
                } else {
                  exactLocation = 'Set Location';
                }
              }

              finalRows.push({
                card: exactCard,
                cardId: deckCardId,
                displayCardId: deckCardId,
                isAlternative: false,
                deckCount,
                ownedCount: exactOwnedCount,
                proxyCount: exactProxyCount,
                location: exactLocation
              });

              // If exact match satisfies deck count, skip alternatives
              if (totalOwnedExact >= deckCount) {
                continue;
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to search for exact card ${deckCardId}:`, error);
        }

        // Step 2: If exact match doesn't satisfy deck count, search for alternatives by card_code
        try {
          const altSearchParams = new URLSearchParams({
            keyword: `id:${deckCardCode}`, // Search by card code to find all variants
            ownedOnly: 'false',
            showProxies: 'true'
          });

          const altResponse = await fetch(`${api}/api/cards/search?${altSearchParams.toString()}`, {
            credentials: 'include',
          });

          if (altResponse.ok) {
            const altResults = await altResponse.json();

            // Handle both new paginated format and legacy format
            const altSearchResults = Array.isArray(altResults) ? altResults : altResults.results || [];

            // Find alternative cards with the same card_code but different ID
            const alternatives = altSearchResults.filter(card =>
              card.card_code === deckCardCode &&
              card.id !== deckCardId &&
              (card.owned_count > 0 || card.proxy_count > 0)
            );

            // Sort alternatives by owned count (descending) to prioritize higher counts
            alternatives.sort((a, b) => {
              const aTotal = (a.owned_count || 0) + (a.proxy_count || 0);
              const bTotal = (b.owned_count || 0) + (b.proxy_count || 0);
              return bTotal - aTotal;
            });

            // Add alternative cards until we have enough to satisfy deck count
            let remainingNeeded = deckCount;
            const exactCard = finalRows.find(row => row.cardId === deckCardId);
            if (exactCard) {
              remainingNeeded = deckCount - (exactCard.ownedCount + exactCard.proxyCount);
            }

            for (const altCard of alternatives) {
              if (remainingNeeded <= 0) break;

              const altOwnedCount = altCard.owned_count || 0;
              const altProxyCount = altCard.proxy_count || 0;
              const altTotalOwned = altOwnedCount + altProxyCount;

              if (altTotalOwned > 0) {
                let altLocation = 'Not Owned';
                if (altTotalOwned > 0) {
                  if (altCard.location && altCard.location.name) {
                    altLocation = altCard.location.name;
                  } else {
                    altLocation = 'Set Location';
                  }
                }

                finalRows.push({
                  card: altCard,
                  cardId: altCard.id,
                  displayCardId: `* ${altCard.id}`, // Prefix with * to indicate alternative
                  isAlternative: true,
                  deckCount: Math.min(remainingNeeded, altTotalOwned),
                  ownedCount: altOwnedCount,
                  proxyCount: altProxyCount,
                  location: altLocation
                });

                remainingNeeded -= altTotalOwned;
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to search for alternatives of card ${deckCardCode}:`, error);
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

  // Handle location update
  const handleLocationUpdate = async (updatedCard) => {
    // Update the locate data with the new location information
    setLocateData(prevData => {
      return prevData.map(row => {
        if (row.cardId === updatedCard.id) {
          const updatedLocation = updatedCard.location && updatedCard.location.name
            ? updatedCard.location.name
            : 'Set Location';

          return {
            ...row,
            card: updatedCard,
            location: updatedLocation
          };
        }
        return row;
      });
    });

    toast({
      title: 'Location Updated',
      description: `Card location updated successfully`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });

    onLocationModalClose();
  };

  // Handle move all cards to a location
  const handleMoveAllClick = () => {
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
    onMoveAllDialogOpen();
  };

  const handleMoveAllConfirm = async () => {
    if (!selectedMoveAllLocation) return;

    setIsMovingAll(true);
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
        return;
      }

      const movePromises = ownedCards.map(async (row) => {
        const locationId = selectedMoveAllLocation === 'remove' ? null : parseInt(selectedMoveAllLocation);

        const response = await fetch(`${api}/api/collection/location`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            cardId: row.cardId,
            locationId: locationId
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update location for card ${row.cardId}`);
        }

        return { cardId: row.cardId, locationId };
      });

      await Promise.all(movePromises);

      // Update locate data with new locations
      setLocateData(prevData => {
        return prevData.map(row => {
          const isAffectedCard = ownedCards.some(ownedRow => ownedRow.cardId === row.cardId);
          if (isAffectedCard) {
            let newLocation;
            if (selectedMoveAllLocation === 'remove') {
              newLocation = 'Set Location';
            } else {
              const selectedLocation = locations.find(loc => loc.id === parseInt(selectedMoveAllLocation));
              newLocation = selectedLocation ? selectedLocation.name : 'Set Location';
            }

            return {
              ...row,
              location: newLocation,
              card: {
                ...row.card,
                location: selectedMoveAllLocation === 'remove' ? null : {
                  id: parseInt(selectedMoveAllLocation),
                  name: newLocation
                }
              }
            };
          }
          return row;
        });
      });

      toast({
        title: 'Locations Updated',
        description: `Updated locations for ${ownedCards.length} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error moving cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card locations. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsMovingAll(false);
      setSelectedMoveAllLocation('');
      onMoveAllDialogClose();
    }
  };

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
      <Modal isOpen={isOpen} onClose={onClose} size={modalSize} scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent maxH="90vh">
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <Text>Locate Deck Cards</Text>
              <Text fontSize="sm" color="gray.600">
                Track your physical cards and their locations
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {isLoading && locateData.length === 0 ? (
              <VStack spacing={4} py={8}>
                <Spinner size="lg" color="blue.500" />
                <Text color="gray.600">Loading card locations...</Text>
              </VStack>
            ) : (
                <VStack spacing={4} align="stretch">
                  {/* Modern Compact Controls */}
                  {locateData.length > 0 && (
                    <Box
                      bg="white"
                      border="1px"
                      borderColor="gray.200"
                      borderRadius="lg"
                      p={4}
                      shadow="sm"
                    >
                      <HStack spacing={6} align="center" justify="space-between" flexWrap="wrap">
                        {/* Hide Complete Switch */}
                        <FormControl display="flex" alignItems="center" w="auto">
                          <FormLabel htmlFor="hide-complete" mb={0} mr={3} fontSize="sm" fontWeight="medium">
                            Hide Complete
                          </FormLabel>
                          <Switch
                            id="hide-complete"
                            isChecked={hideComplete}
                            onChange={(e) => setHideComplete(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                          />
                        </FormControl>

                        {/* Move All Controls */}
                        <HStack spacing={3} flex="1" justify="flex-end" minW="280px">
                          <Text fontSize="sm" color="gray.600" fontWeight="medium" whiteSpace="nowrap">
                            Move all to:
                          </Text>
                          <Select
                            placeholder="Choose location..."
                            size="sm"
                            maxW="180px"
                            value={selectedMoveAllLocation}
                            onChange={(e) => setSelectedMoveAllLocation(e.target.value)}
                            bg="white"
                            borderColor="gray.300"
                            borderRadius="md"
                            fontSize="sm"
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
                          >
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                            <option value="remove" style={{ color: 'red' }}>
                              Remove Location
                            </option>
                          </Select>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={handleMoveAllClick}
                            isDisabled={!selectedMoveAllLocation}
                            minW="80px"
                          >
                            Move All
                          </Button>
                        </HStack>
                      </HStack>
                    </Box>
                  )}

                {/* Cards Display - Table for Desktop, Cards for Mobile */}
                {isMobile ? (
                  // Mobile View - Card Layout
                  <Box
                    ref={scrollContainerRef}
                    maxH="500px"
                    overflowY="auto"
                  >
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
                        />
                      );
                    })}
                  </Box>
                ) : (
                  // Desktop View - Table Layout
                  <Box
                    ref={scrollContainerRef}
                    maxH="500px"
                    overflowY="auto"
                    border="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                  >
                    <Table size="sm" variant="simple">
                      <Thead position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <Tr>
                          <Th width="80px">Card</Th>
                          <Th>Name</Th>
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
                            <Tr key={`${row.cardId}-${index}`} bg={isIncomplete ? 'red.50' : (row.isAlternative ? 'yellow.50' : 'white')}>
                              <Td p={2}>
                                <CardImage
                                  card={row.card}
                                  src={row.card.img_url}
                                  alt={row.card.name}
                                  width="40px"
                                  height="56px"
                                  objectFit="cover"
                                  fallbackSrc="/placeholder.png"
                                />
                              </Td>
                              <Td p={2}>
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
                                        Alt: {row.displayCardId}
                                      </Text>
                                    )}
                                  </HStack>
                                </VStack>
                              </Td>
                              <Td p={2} textAlign="center">
                                <Text fontSize="sm" fontWeight="bold" color={isIncomplete ? "red.600" : "black"}>
                                  {row.deckCount}
                                </Text>
                              </Td>
                              <Td p={2} textAlign="center">
                                <Text fontSize="sm" fontWeight={needMoreCards ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                                  {row.ownedCount}
                                </Text>
                              </Td>
                              <Td p={2} textAlign="center">
                                <Text fontSize="sm" fontWeight={row.proxyCount > 0 ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                                  {row.proxyCount}
                                </Text>
                              </Td>
                              <Td p={2}>
                                {typeof row.location === 'string' && (row.location === 'Loading...' || row.location === 'Not Owned') ? (
                                  <Text fontSize="xs" color="gray.500">
                                    {row.location}
                                  </Text>
                                ) : (
                                  <InteractiveLocationBadge
                                    card={row.card}
                                    onLocationChange={handleLocationChange}
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

                {filteredData.length === 0 && !isLoading && (
                  <Text textAlign="center" color="gray.500" py={8}>
                    {hideComplete ? 'No incomplete cards to display' : 'No cards to display'}
                  </Text>
                )}
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Set Location Modal */}
      <SetLocationModal
        isOpen={isLocationModalOpen}
        onClose={onLocationModalClose}
        card={selectedCard}
        onLocationSet={handleLocationUpdate}
      />

      {/* Move All Confirmation Dialog */}
      <AlertDialog
        isOpen={isMoveAllDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onMoveAllDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Move All Cards
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to move all owned cards to the selected location? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onMoveAllDialogClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleMoveAllConfirm} ml={3} isLoading={isMovingAll}>
                Move All Cards
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default LocateModal;
