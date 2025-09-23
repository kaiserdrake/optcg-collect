import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Badge,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Collapse,
  useDisclosure,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
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
  Flex
} from '@chakra-ui/react';

import { BsSortUp, BsSortDown } from 'react-icons/bs';
import { FiMapPin, FiHash, FiSettings, FiTag } from 'react-icons/fi';
import { RiFileSearchFill } from 'react-icons/ri';

import DeckCard from './DeckCard';
import CardDetailModal from './CardDetailModal';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

const TabletopCanvas = ({
  cards = [],
  onCardClick,
  onCountUpdate,
  onLocationUpdate,
  onTagUpdate
}) => {
  const toast = useToast();
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: false });

  const [allDisplayCards, setAllDisplayCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [sortMode, setSortMode] = useState('name');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(80);

  const {
    isOpen: isCardDetailOpen,
    onOpen: onCardDetailOpen,
    onClose: onCardDetailClose
  } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);

  const {
    isOpen: isBulkMoveOpen,
    onOpen: onBulkMoveOpen,
    onClose: onBulkMoveClose
  } = useDisclosure();
  const {
    isOpen: isBulkCountOpen,
    onOpen: onBulkCountOpen,
    onClose: onBulkCountClose
  } = useDisclosure();
  const {
    isOpen: isBulkProxyOpen,
    onOpen: onBulkProxyOpen,
    onClose: onBulkProxyClose
  } = useDisclosure();
  const {
    isOpen: isBulkTagOpen,
    onOpen: onBulkTagOpen,
    onClose: onBulkTagClose
  } = useDisclosure();
  const {
    isOpen: isFailedMoveOpen,
    onOpen: onFailedMoveOpen,
    onClose: onFailedMoveClose
  } = useDisclosure();

  const [bulkLocationId, setBulkLocationId] = useState(null);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkProxyCount, setBulkProxyCount] = useState(0);
  const [bulkTag, setBulkTag] = useState('');
  const [failedMoves, setFailedMoves] = useState([]);

  useEffect(() => {
    if (cards.length > 0) {
      setAllDisplayCards(prevCards => {
        const currentCardIds = new Set(cards.map(c => c.id));
        const filteredPrevCards = prevCards.filter(card =>
          currentCardIds.has(card.id) || selectedCards.has(card.id)
        );

        const existingIds = new Set(filteredPrevCards.map(c => c.id));
        const newCards = cards.filter(card => !existingIds.has(card.id));

        return [...filteredPrevCards, ...newCards];
      });
    }
  }, [cards, selectedCards]);

  const sortedCards = React.useMemo(() => {
    if (!Array.isArray(allDisplayCards) || allDisplayCards.length === 0) {
      return [];
    }

    const sorted = [...allDisplayCards].sort((a, b) => {
      let comparison = 0;

      switch (sortMode) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'cost':
          const aCost = a.cost !== null ? a.cost : -1;
          const bCost = b.cost !== null ? b.cost : -1;
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

  const handleCardSelection = useCallback((cardId, forceSelect = null) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      const shouldSelect = forceSelect !== null ? forceSelect : !newSet.has(cardId);

      if (shouldSelect) {
        newSet.add(cardId);
      } else {
        newSet.delete(cardId);
      }
      return newSet;
    });
  }, []);

  const handleCardClick = useCallback((card) => {
    handleCardSelection(card.id);
  }, [handleCardSelection]);

  const handleDetailClick = useCallback((card, event) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedCard(card);
    onCardDetailOpen();
  }, [onCardDetailOpen]);

  const handleSelectAll = useCallback(() => {
    const allSelected = cards.length > 0 && cards.every(card => selectedCards.has(card.id));
    if (allSelected) {
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        cards.forEach(card => newSet.delete(card.id));
        return newSet;
      });
    } else {
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        cards.forEach(card => newSet.add(card.id));
        return newSet;
      });
    }
  }, [cards, selectedCards]);

  const handleClearAll = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const handleCardDetailUpdate = useCallback((cardId, updateData) => {
    setAllDisplayCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, ...updateData } : card
      )
    );

    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(prev => ({ ...prev, ...updateData }));
    }

    if (onCountUpdate) {
      onCountUpdate(cardId, updateData);
    }
  }, [selectedCard, onCountUpdate]);

  const handleBulkMove = useCallback(async () => {
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

    const failed = [];
    const succeeded = [];

    try {
      for (const cardId of selectedCards) {
        const card = allDisplayCards.find(c => c.id === cardId);
        if (!card) continue;

        const hasCard = (card.owned_count || 0) > 0 || (card.proxy_count || 0) > 0;
        if (!hasCard) {
          failed.push({
            cardName: card.name,
            cardCode: card.card_code,
            reason: 'Not in collection'
          });
          continue;
        }

        try {
          if (onLocationUpdate) {
            await onLocationUpdate(cardId, bulkLocationId);
            succeeded.push(cardId);
          }
        } catch (error) {
          failed.push({
            cardName: card.name,
            cardCode: card.card_code,
            reason: error.message || 'Update failed'
          });
        }
      }

      if (succeeded.length > 0) {
        toast({
          title: 'Location updated',
          description: `Successfully moved ${succeeded.length} cards`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      if (failed.length > 0) {
        setFailedMoves(failed);
        onFailedMoveOpen();
      }

      setBulkLocationId(null);
      onBulkMoveClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update locations',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkLocationId, allDisplayCards, onLocationUpdate, toast, onBulkMoveClose, onFailedMoveOpen]);

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

    const failed = [];
    const succeeded = [];

    try {
      for (const cardId of selectedCards) {
        const card = allDisplayCards.find(c => c.id === cardId);
        if (!card) continue;

        try {
          const response = await fetch(`${api}/api/collection/set-count`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              cardId: cardId,
              ownedCount: bulkCount,
              proxyCount: card.proxy_count || 0
            }),
          });

          if (response.ok) {
            const data = await response.json();
            succeeded.push({ cardId, data });

            setAllDisplayCards(prev =>
              prev.map(c =>
                c.id === cardId
                  ? { ...c, owned_count: data.owned_count, proxy_count: data.proxy_count }
                  : c
              )
            );

            if (onCountUpdate) {
              onCountUpdate(cardId, data);
            }
          } else {
            const errorData = await response.json();
            failed.push({
              cardName: card.name,
              cardCode: card.card_code,
              reason: errorData.message || 'Update failed'
            });
          }
        } catch (error) {
          failed.push({
            cardName: card.name,
            cardCode: card.card_code,
            reason: error.message || 'Network error'
          });
        }
      }

      if (succeeded.length > 0) {
        toast({
          title: 'Counts updated',
          description: `Updated counts for ${succeeded.length} cards`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      if (failed.length > 0) {
        setFailedMoves(failed);
        onFailedMoveOpen();
      }

      onBulkCountClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update counts',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkCount, allDisplayCards, onCountUpdate, toast, onBulkCountClose, onFailedMoveOpen]);

  const handleBulkSetProxy = useCallback(async () => {
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

    const failed = [];
    const succeeded = [];

    try {
      for (const cardId of selectedCards) {
        const card = allDisplayCards.find(c => c.id === cardId);
        if (!card) continue;

        try {
          const response = await fetch(`${api}/api/collection/set-count`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              cardId: cardId,
              ownedCount: card.owned_count || 0,
              proxyCount: bulkProxyCount
            }),
          });

          if (response.ok) {
            const data = await response.json();
            succeeded.push({ cardId, data });

            setAllDisplayCards(prev =>
              prev.map(c =>
                c.id === cardId
                  ? { ...c, owned_count: data.owned_count, proxy_count: data.proxy_count }
                  : c
              )
            );

            if (onCountUpdate) {
              onCountUpdate(cardId, data);
            }
          } else {
            const errorData = await response.json();
            failed.push({
              cardName: card.name,
              cardCode: card.card_code,
              reason: errorData.message || 'Update failed'
            });
          }
        } catch (error) {
          failed.push({
            cardName: card.name,
            cardCode: card.card_code,
            reason: error.message || 'Network error'
          });
        }
      }

      if (succeeded.length > 0) {
        toast({
          title: 'Proxy counts updated',
          description: `Updated proxy counts for ${succeeded.length} cards`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      if (failed.length > 0) {
        setFailedMoves(failed);
        onFailedMoveOpen();
      }

      onBulkProxyClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update proxy counts',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkProxyCount, allDisplayCards, onCountUpdate, toast, onBulkProxyClose, onFailedMoveOpen]);

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
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="lg"
        overflow="hidden"
        w="100%"
      >
        <Button
          variant="ghost"
          w="100%"
          justifyContent="space-between"
          p={3}
          borderRadius="none"
          size="sm"
          _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
          onClick={onToggle}
        >
          <Text fontSize="md" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
            Tabletop
          </Text>
          <HStack spacing={2}>
            <Badge variant="solid" colorScheme={selectedCards.size > 0 ? 'blue' : 'gray'}>
              {selectedCards.size} selected
            </Badge>
            <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
              {allDisplayCards.length} cards shown
            </Text>
            <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </HStack>
        </Button>

        <Collapse in={isExpanded}>
          <Box p={3} borderTop="1px solid" borderColor={useColorModeValue('gray.200', 'gray.600')}>
            <VStack spacing={3}>
              <HStack spacing={4} wrap="wrap" justify="space-between" w="100%">
                <HStack spacing={3}>
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
                  <Button size="sm" variant="outline" onClick={handleSelectAll}>
                    {cards.length > 0 && cards.every(card => selectedCards.has(card.id)) ?
                      'Deselect All' : 'Select All'}
                  </Button>

                  <Button size="sm" variant="outline" onClick={handleClearAll}>
                    Clear All
                  </Button>

                  {selectedCards.size > 0 && (
                    <Menu>
                      <MenuButton as={Button} size="sm" colorScheme="blue" variant="outline">
                        Bulk Actions ({selectedCards.size})
                      </MenuButton>
                      <MenuList>
                        <MenuItem icon={<FiMapPin />} onClick={onBulkMoveOpen}>
                          Move to Location
                        </MenuItem>
                        <MenuItem icon={<FiHash />} onClick={onBulkCountOpen}>
                          Set Count
                        </MenuItem>
                        <MenuItem icon={<FiSettings />} onClick={onBulkProxyOpen}>
                          Set Proxy Count
                        </MenuItem>
                        <MenuItem icon={<FiTag />} onClick={onBulkTagOpen}>
                          Set Tag
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  )}
                </HStack>
              </HStack>

              <Box w="100%" minH="120px" maxH="400px">
                {allDisplayCards.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500">No cards in tabletop</Text>
                    <Text color="gray.400" fontSize="sm" mt={1}>
                      Search for cards to see them appear here
                    </Text>
                  </Box>
                ) : (
                  <Flex
                    overflowX="auto"
                    overflowY="hidden"
                    gap={2}
                    py={2}
                    css={{
                      '&::-webkit-scrollbar': {
                        height: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: '#555',
                      },
                    }}
                  >
                    {sortedCards.map((card) => {
                      const isSelected = selectedCards.has(card.id);
                      const isFromCurrentSearch = cards.some(c => c.id === card.id);

                      return (
                        <Box
                          key={card.id}
                          position="relative"
                          flexShrink={0}
                          width={`${thumbnailSize}px`}
                          height={`${Math.floor(thumbnailSize * 1.4)}px`}
                          role="group"
                        >
                          <Box
                            position="absolute"
                            top="8px"
                            right="8px"
                            opacity={0}
                            _groupHover={{ opacity: 1 }}
                            transition="opacity 0.2s"
                            zIndex={3}
                          >
                            <IconButton
                              icon={<RiFileSearchFill />}
                              size="sm"
                              colorScheme="blue"
                              variant="solid"
                              onClick={(e) => handleDetailClick(card, e)}
                              aria-label="View card details"
                              borderRadius="full"
                              shadow="md"
                            />
                          </Box>

                          <Box
                            border={isSelected ? "2px solid" : "1px solid"}
                            borderColor={isSelected ? "blue.400" : "transparent"}
                            borderRadius="md"
                            transition="all 0.2s"
                            filter={isSelected ? "none" : "grayscale(100%)"}
                            opacity={isSelected ? 1 : (isFromCurrentSearch ? 0.7 : 0.5)}
                            _hover={{
                              filter: isSelected ? "none" : "grayscale(50%)",
                              opacity: 1
                            }}
                            height="100%"
                            cursor="pointer"
                            onClick={() => handleCardClick(card)}
                          >
                            <DeckCard
                              item={{ card, count: card.owned_count || 1 }}
                              onCardClick={() => {}}
                              isViewOnly={true}
                              thumbnailSize={thumbnailSize}
                              hideCount={true}
                            />
                          </Box>

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
                  </Flex>
                )}
              </Box>
            </VStack>
          </Box>
        </Collapse>
      </Box>

      <CardDetailModal
        isOpen={isCardDetailOpen}
        onClose={onCardDetailClose}
        selectedCard={selectedCard}
        interactive={true}
        onCountUpdate={handleCardDetailUpdate}
      />

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
                Only cards you own will be moved.
              </Text>
              <LocationSelector
                selectedLocationId={bulkLocationId}
                onLocationSelect={setBulkLocationId}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onBulkMoveClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleBulkMove}
                isDisabled={bulkLocationId === undefined}
              >
                {bulkLocationId === null ? 'Remove from Location' : 'Move Cards'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBulkCountOpen} onClose={onBulkCountClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiHash />
              <Text>Set Count for Selected Cards</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Set the owned count for {selectedCards.size} selected cards.
              </Text>
              <NumberInput
                value={bulkCount}
                onChange={(value) => setBulkCount(parseInt(value) || 0)}
                min={0}
                max={99}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onBulkCountClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleBulkSetCount}>
                Set Count
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBulkProxyOpen} onClose={onBulkProxyClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiSettings />
              <Text>Set Proxy Count for Selected Cards</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Set the proxy count for {selectedCards.size} selected cards.
                Owned counts will remain unchanged.
              </Text>
              <NumberInput
                value={bulkProxyCount}
                min={0}
                max={99}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onBulkProxyClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleBulkSetProxy}>
                Set Proxy Count
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBulkTagOpen} onClose={onBulkTagClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiTag />
              <Text>Set Tag for Selected Cards</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Set a tag for {selectedCards.size} selected cards.
              </Text>
              <Input
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                placeholder="Enter tag name..."
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onBulkTagClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleBulkSetTag}>
                Set Tag
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isFailedMoveOpen} onClose={onFailedMoveClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Operation Results</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {failedMoves.length > 0 && (
                <>
                  <Text fontSize="md" fontWeight="semibold" color="red.600">
                    Failed to process {failedMoves.length} cards:
                  </Text>
                  <Box maxHeight="300px" overflowY="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Card</Th>
                          <Th>Code</Th>
                          <Th>Reason</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {failedMoves.map((failed, index) => (
                          <Tr key={index}>
                            <Td>{failed.cardName}</Td>
                            <Td>
                              <Text fontSize="xs" fontFamily="mono">
                                {failed.cardCode}
                              </Text>
                            </Td>
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
