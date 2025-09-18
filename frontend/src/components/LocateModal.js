'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Text,
  Spinner,
  HStack,
  VStack,
  Badge,
  Button,
  Select,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tag,
  Tooltip,
  ButtonGroup,
  Divider
} from '@chakra-ui/react';
import { FiMapPin, FiMove, FiEdit3 } from 'react-icons/fi';
import CardImage from './CardImage';
import SetLocationModal from './SetLocationModal';
import { CARD_EVENTS } from '@/utils/cardEvents';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper: Chakra color for marker
const markerColorToColor = (marker) => {
  switch (marker) {
    case 'red': return 'red.500';
    case 'orange': return 'orange.500';
    case 'yellow': return 'yellow.400';
    case 'green': return 'green.500';
    case 'blue': return 'blue.500';
    case 'purple': return 'purple.500';
    case 'pink': return 'pink.400';
    case 'gray': return 'gray.500';
    default: return 'blue.500';
  }
};

// Helper function to truncate text
const truncateText = (text, maxLength = 20) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
};

// Interactive Location Badge Component
const InteractiveLocationBadge = ({ card, onLocationChange }) => {
  const owned = (card.owned_count || 0);
  const proxy = (card.proxy_count || 0);
  const hasCard = owned > 0 || proxy > 0;

  if (!hasCard) {
    return (
      <Tag size="sm" variant="outline" colorScheme="gray">
        <Text fontSize="xs">Not Owned</Text>
      </Tag>
    );
  }

  const location = card.location;
  const locationName = location?.name || 'Set Location';
  const marker = location?.marker || 'gray';
  const color = markerColorToColor(marker);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLocationChange) {
      onLocationChange(card);
    }
  };

  return (
    <Tooltip label="Click to change location" placement="top">
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

const LocateModal = ({ isOpen, onClose, deck }) => {
  const [locateData, setLocateData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMoveAllLocation, setSelectedMoveAllLocation] = useState('');
  const [isMovingAll, setIsMovingAll] = useState(false);

  const toast = useToast();
  const scrollContainerRef = useRef(null);

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
    setLocateData([]); // Clear existing data

    try {
      // Get all unique card IDs from deck
      const deckCardMap = new Map();
      deck.cards.forEach(item => {
        const cardId = item.card.id;
        const count = item.count;
        deckCardMap.set(cardId, count);
      });

      // Get all unique base card IDs to search for alternatives
      const allCardIds = Array.from(deckCardMap.keys());
      const baseCardIds = [...new Set(allCardIds.map(getBaseCardId))];

      // Initialize rows with deck cards showing "Loading..." state
      const initialRows = [];
      deckCardMap.forEach((deckCount, deckCardId) => {
        const deckCard = deck.cards.find(item => item.card.id === deckCardId);

        initialRows.push({
          card: deckCard.card,
          cardId: deckCardId,
          isOriginal: true,
          deckCount,
          ownedCount: '...',
          proxyCount: '...',
          location: 'Loading...'
        });
      });

      // Set initial data immediately to show progressive loading
      setLocateData(initialRows);

      // Search for cards progressively - process each card individually
      const allCollectionCards = [];
      let processedCount = 0;

      // First, search for each exact card in the deck
      for (const [deckCardId, count] of deckCardMap.entries()) {
        try {
          const searchParams = new URLSearchParams({
            keyword: `id:${deckCardId}`, // Use exact ID search for best results
            ownedOnly: 'false',
            showProxies: 'true'
          });

          const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
            credentials: 'include',
          });

          if (response.ok) {
            const cards = await response.json();
            allCollectionCards.push(...cards);

            // Update the specific row with real data as soon as we get it
            const exactCard = cards.find(card => card.id === deckCardId);
            if (exactCard) {
              setLocateData(prevData =>
                prevData.map(row => {
                  if (row.cardId === deckCardId) {
                    const exactOwnedCount = exactCard.owned_count || 0;
                    const exactProxyCount = exactCard.proxy_count || 0;

                    // Fixed location handling: Check for location object structure
                    let exactLocation = 'Not Owned';
                    if (exactOwnedCount > 0 || exactProxyCount > 0) {
                      if (exactCard.location && exactCard.location.name) {
                        exactLocation = exactCard.location.name;
                      } else {
                        exactLocation = 'Set Location';
                      }
                    }

                    return {
                      ...row,
                      card: exactCard,
                      ownedCount: exactOwnedCount,
                      proxyCount: exactProxyCount,
                      location: exactLocation
                    };
                  }
                  return row;
                })
              );
            }
          }

          processedCount++;

          // Small delay between requests to prevent overwhelming the server
          if (processedCount < deckCardMap.size) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }

        } catch (error) {
          console.warn(`Failed to search for exact card ${deckCardId}:`, error);

          // Update row to show error state
          setLocateData(prevData =>
            prevData.map(row => {
              if (row.cardId === deckCardId) {
                return {
                  ...row,
                  ownedCount: 0,
                  proxyCount: 0,
                  location: 'Not Owned'
                };
              }
              return row;
            })
          );
        }
      }

      // Then search for base card families to find alternatives (in the background)
      const processedBaseIds = new Set();

      for (const baseId of baseCardIds) {
        if (processedBaseIds.has(baseId)) continue;
        processedBaseIds.add(baseId);

        try {
          const searchParams = new URLSearchParams({
            keyword: baseId,
            ownedOnly: 'false',
            showProxies: 'true'
          });

          const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
            credentials: 'include',
          });

          if (response.ok) {
            const cards = await response.json();
            allCollectionCards.push(...cards);
          }
        } catch (error) {
          console.warn(`Failed to search for base family ${baseId}:`, error);
        }
      }

      // Remove duplicates based on card ID
      const collectionCards = allCollectionCards.filter((card, index, array) =>
        array.findIndex(c => c.id === card.id) === index
      );

      // Group collection cards by base card ID
      const collectionMap = new Map();
      collectionCards.forEach(card => {
        const baseId = getBaseCardId(card.id);
        if (!collectionMap.has(baseId)) {
          collectionMap.set(baseId, []);
        }
        collectionMap.get(baseId).push(card);
      });

      // Final update: Add alternative cards
      setLocateData(prevData => {
        const updatedData = [...prevData];

        deckCardMap.forEach((deckCount, deckCardId) => {
          const baseCardId = getBaseCardId(deckCardId);

          // Find alternatives for this base card family
          const alternatives = collectionMap.get(baseCardId) || [];
          const alternativeCards = alternatives.filter(card =>
            card.id !== deckCardId &&
            ((card.owned_count || 0) > 0 || (card.proxy_count || 0) > 0)
          );

          // Add alternative cards after the main card
          const prioritizedAlternatives = prioritizeAlternatives(alternativeCards);

          prioritizedAlternatives.forEach(altCard => {
            const altOwnedCount = altCard.owned_count || 0;
            const altProxyCount = altCard.proxy_count || 0;

            // Fixed location handling for alternatives
            let altLocation = 'Set Location';
            if (altCard.location && altCard.location.name) {
              altLocation = altCard.location.name;
            }

            // Check if this alternative is already in the data
            const existsAlready = updatedData.some(row => row.cardId === altCard.id);

            if (!existsAlready) {
              updatedData.push({
                card: altCard,
                cardId: altCard.id,
                isOriginal: false,
                deckCount: 0,
                ownedCount: altOwnedCount,
                proxyCount: altProxyCount,
                location: altLocation
              });
            }
          });
        });

        return updatedData;
      });

    } catch (error) {
      console.error('Error generating locate data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load location data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [deck, toast]);

  // Handle location change for individual card
  const handleLocationChange = (card) => {
    setSelectedCard(card);
    onLocationModalOpen();
  };

  // Handle location update callback from SetLocationModal
  const handleLocationUpdate = async () => {
    if (!selectedCard) return;

    // Close the location modal first
    onLocationModalClose();

    try {
      // Fetch updated card data for just this card
      const searchParams = new URLSearchParams({
        keyword: `id:${selectedCard.id}`,
        ownedOnly: 'false',
        showProxies: 'true'
      });

      const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const cards = await response.json();
        const updatedCard = cards.find(card => card.id === selectedCard.id);

        if (updatedCard) {
          // Update only the specific card in the locate data
          setLocateData(prevData =>
            prevData.map(row => {
              if (row.cardId === selectedCard.id) {
                const ownedCount = updatedCard.owned_count || 0;
                const proxyCount = updatedCard.proxy_count || 0;

                // Fixed location handling: Check for location object structure
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
            })
          );

          // Show success feedback to user
          toast({
            title: 'Location Updated',
            description: `Location updated for ${updatedCard.name}`,
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error('Error updating location in LocateModal:', error);
      toast({
        title: 'Update Error',
        description: 'Failed to update location data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }

    // Clear selected card
    setSelectedCard(null);
  };

  // Handle Move All confirmation
  const handleMoveAllConfirm = async () => {
    if (!selectedMoveAllLocation) return;

    setIsMovingAll(true);
    try {
      // Get all unique cards that are owned in the collection
      const cardsToMove = locateData
        .filter(row => (row.ownedCount > 0 || row.proxyCount > 0))
        .map(row => row.cardId);

      // Remove duplicates
      const uniqueCardsToMove = [...new Set(cardsToMove)];

      let successCount = 0;
      let errorCount = 0;

      // Update location for each card
      for (const cardId of uniqueCardsToMove) {
        try {
          const response = await fetch(`${api}/api/collection/location`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cardId,
              locationId: selectedMoveAllLocation === 'none' ? null : parseInt(selectedMoveAllLocation)
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
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader pr={16}>
            <Text>Card Location</Text>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {isLoading ? (
              <VStack spacing={4} py={8}>
                <Spinner size="lg" color="blue.500" />
                <Text>Loading card locations...</Text>
              </VStack>
            ) : (
                <VStack spacing={4} align="stretch">
                  {/* Move All Section */}
                  {locateData.length > 0 && (
                    <Box>
                      <HStack spacing={4} align="center">
                        <Text fontSize="sm" fontWeight="medium">
                          Move All Cards To:
                        </Text>
                        <Select
                          size="sm"
                          placeholder="Select location..."
                          value={selectedMoveAllLocation}
                          onChange={(e) => setSelectedMoveAllLocation(e.target.value)}
                          maxW="200px"
                        >
                          <option value="none">No Location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          leftIcon={<FiMove />}
                          onClick={onMoveAllDialogOpen}
                          isDisabled={!selectedMoveAllLocation || isMovingAll}
                          isLoading={isMovingAll}
                        >
                          Move All
                        </Button>
                      </HStack>
                      <Divider mt={4} />
                    </Box>
                  )}

                  {/* Card Location Table */}
                  <Box
                    ref={scrollContainerRef}
                    maxHeight="400px"
                    overflowY="auto"
                    borderWidth="1px"
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
                            <Tr key={`${row.cardId}-${index}`} bg={row.isOriginal ? 'white' : 'gray.50'}>
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
                                  <Text fontSize="xs" color="gray.600">
                                    {row.card.card_code}
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
              <Button
                colorScheme="blue"
                onClick={handleMoveAllConfirm}
                ml={3}
                isLoading={isMovingAll}
              >
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
