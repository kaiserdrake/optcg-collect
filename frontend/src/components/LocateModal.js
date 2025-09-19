// frontend/src/components/LocateModal.js
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
  useBreakpointValue
} from '@chakra-ui/react';

import { FiMapPin } from 'react-icons/fi';
import CardImage from './CardImage';
import SetLocationModal from './SetLocationModal';
import { CARD_EVENTS } from '@/utils/cardEvents';

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
const MobileCardRow = ({ row, needMoreCards, onLocationChange }) => {
  return (
    <Box
      bg={row.isAlternative ? 'yellow.50' : 'white'}
      borderRadius="md"
      border="1px"
      borderColor={row.isAlternative ? 'yellow.200' : 'gray.200'}
      p={3}
      mb={2}
    >
      <HStack spacing={3} align="start">
        {/* Card Image */}
        <Box width="60px" height="60px" flexShrink={0}>
          <CardImage
            src={row.card.img_url}
            alt={row.card.name}
            width="100%"
            height="100%"
            borderRadius="md"
          />
        </Box>

        {/* Card Info */}
        <VStack align="start" spacing={1} flex="1">
          <Text fontSize="sm" fontWeight="medium" lineHeight="1.2" noOfLines={2}>
            {row.card.name}
          </Text>
          <Text fontSize="xs" color="gray.600" fontFamily="monospace">
            {row.displayCardId}
          </Text>


          {/* Stats Row */}
          <HStack spacing={4} mt={1}>
            <VStack spacing={0} align="center">
              <Text fontSize="xs" color="gray.500" fontWeight="bold">Deck</Text>
              <Text fontSize="sm" fontWeight="medium" color={needMoreCards ? "red.500" : "black"}>
                {row.deckCount}
              </Text>
            </VStack>
            <VStack spacing={0} align="center">
              <Text fontSize="xs" color="gray.500" fontWeight="bold">Own</Text>
              <Text fontSize="sm" fontWeight={row.ownedCount > 0 ? "bold" : "normal"} color={needMoreCards ? "black" : "green.600"}>
                {row.ownedCount}
              </Text>
            </VStack>
            <VStack spacing={0} align="center">
              <Text fontSize="xs" color="gray.500" fontWeight="bold">Proxy</Text>
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
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMoveAllLocation, setSelectedMoveAllLocation] = useState('');
  const [isMovingAll, setIsMovingAll] = useState(false);


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
            const exactCard = exactResults.find(card => card.id === deckCardId);

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

            // Find alternative cards with the same card_code but different ID
            const alternatives = altResults.filter(card =>
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

  // Handle location change for individual cards
  const handleLocationChange = (card) => {
    setSelectedCard(card);
    onLocationModalOpen();
  };

  // Handle location update callback
  const handleLocationUpdate = async (updatedCard) => {
    // Refresh the locate data to reflect the location change
    await generateLocateData();

    toast({
      title: 'Location updated',
      description: `Location for ${updatedCard.name} has been updated`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle move all cards
  const handleMoveAll = () => {
    if (selectedMoveAllLocation === null || selectedMoveAllLocation === undefined) {
      toast({
        title: 'No location selected',
        description: 'Please select a location or choose "Remove location"',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    onMoveAllDialogOpen();
  };

  // Execute move all operation
  const handleMoveAllConfirm = async () => {
    setIsMovingAll(true);

    try {
      // Get all cards that are owned (owned_count > 0 or proxy_count > 0)
      const ownedCards = locateData.filter(row =>
        (row.ownedCount > 0 || row.proxyCount > 0) &&
        typeof row.ownedCount === 'number' &&
        typeof row.proxyCount === 'number'
      );

      if (ownedCards.length === 0) {
        toast({
          title: 'No cards to move',
          description: 'No owned cards found to move',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Update location for each owned card
      for (const row of ownedCards) {
        try {
          const cardId = row.card.id;
          const response = await fetch(`${api}/api/collection/location`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              cardId: cardId,

              locationId: selectedMoveAllLocation === 'remove' ? null : parseInt(selectedMoveAllLocation)
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to update location for card ${cardId}:`, error);
          errorCount++;
        }
      }

      // Refresh the data
      await generateLocateData();

      // Show result toast
      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully moved ${successCount} card${successCount !== 1 ? 's' : ''} to the selected location`,
          status: 'success',
          duration: 3000,

          isClosable: true,
        });
      } else {
        toast({
          title: 'Partially Completed',
          description: `Moved ${successCount} cards successfully, ${errorCount} failed`,
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('Error during move all operation:', error);
      toast({
        title: 'Error',
        description: 'Failed to move cards. Please try again.',
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
                <Spinner size="xl" color="blue.500" />
                <Text color="gray.600">Loading deck cards...</Text>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Move All Cards Section */}
                {locateData.some(row => row.ownedCount > 0 || row.proxyCount > 0) && (
                  <Box
                    bg="blue.50"
                    p={4}
                    borderRadius="md"
                    border="1px"
                    borderColor="blue.200"
                  >
                    <VStack spacing={3} align="stretch">
                      <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                        Bulk Location Update
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <Select
                          value={selectedMoveAllLocation}
                          onChange={(e) => setSelectedMoveAllLocation(e.target.value)}
                          size="sm"
                          bg="white"
                        >
                          <option value="" disabled style={{ color: '#999' }}>
                            Select location for all cards
                          </option>
                          <option value="remove" style={{ fontStyle: 'italic', color: '#666' }}>
                            🗑️ Remove location
                          </option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id.toString()}>
                              📍 {location.name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={handleMoveAll}
                          isLoading={isMovingAll}
                          loadingText="Moving..."
                          width="full"
                        >
                          {selectedMoveAllLocation === 'remove' ? 'Remove All Locations' : 'Move All Owned Cards'}
                        </Button>
                      </VStack>
                    </VStack>
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
                    {locateData.map((row, index) => {
                      const totalOwnedCards = (row.ownedCount || 0) + (row.proxyCount || 0);
                      const deckCount = row.deckCount || 0;
                      const needMoreCards = deckCount > totalOwnedCards;

                      return (
                        <MobileCardRow
                          key={`${row.cardId}-${index}`}
                          row={row}
                          needMoreCards={needMoreCards}
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
                        {locateData.map((row, index) => {
                          // Calculate total owned cards (owned + proxy)
                          const totalOwnedCards = (row.ownedCount || 0) + (row.proxyCount || 0);
                          const deckCount = row.deckCount || 0;
                          const needMoreCards = deckCount > totalOwnedCards;

                          return (
                            <Tr key={`${row.cardId}-${index}`} bg={row.isAlternative ? 'yellow.50' : 'white'}>
                              <Td p={2}>
                                <Box width="60px" height="60px">
                                  <CardImage
                                    src={row.card.img_url}
                                    alt={row.card.name}
                                    width="100%"
                                    height="100%"
                                    borderRadius="md"
                                  />
                                </Box>
                              </Td>
                              <Td>
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="sm" fontWeight="medium" lineHeight="1.2">
                                    {row.card.name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600" fontFamily="monospace">
                                    {row.displayCardId}
                                  </Text>
                                </VStack>
                              </Td>
                              <Td textAlign="center" color={needMoreCards ? "red.500" : "black"}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {row.deckCount}
                                </Text>
                              </Td>
                              <Td textAlign="center" color={needMoreCards ? "black" : "green.600"}>
                                <Text fontSize="sm" fontWeight={row.ownedCount > 0 ? "bold" : "normal"}>
                                  {row.ownedCount}
                                </Text>
                              </Td>
                              <Td textAlign="center" color={needMoreCards ? "black" : "green.600"}>
                                <Text fontSize="sm" fontWeight={row.proxyCount > 0 ? "bold" : "normal"}>
                                  {row.proxyCount}
                                </Text>
                              </Td>
                              <Td>
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

                {locateData.length === 0 && (
                  <Text textAlign="center" color="gray.500" py={8}>
                    No cards to display
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
