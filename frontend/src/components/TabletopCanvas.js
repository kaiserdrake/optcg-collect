import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Grid,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Badge,
  Checkbox,
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

import { ChevronDownIcon, ChevronUpIcon, RepeatIcon } from '@chakra-ui/icons';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import { FiMapPin, FiHash, FiSettings, FiTag } from 'react-icons/fi';

import DeckCard from './DeckCard';
import CardDetailModal from './CardDetailModal';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Simple LocationSelector component for bulk operations
const LocationSelector = ({ selectedLocationId, onLocationSelect, showCreateNew = false }) => {
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

  return (
    <Select
      placeholder="Select a location"
      value={selectedLocationId || ''}
      onChange={(e) => onLocationSelect(e.target.value ? parseInt(e.target.value) : null)}
    >
      <option value="">Remove from location</option>
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

  // Manage our own collapsible state
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: false });

  // State for tabletop management
  const [allDisplayCards, setAllDisplayCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [sortMode, setSortMode] = useState('name');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(80);

  // Card detail modal
  const {
    isOpen: isCardDetailOpen,
    onOpen: onCardDetailOpen,
    onClose: onCardDetailClose
  } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);

  // Bulk operation modals
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

  // Bulk operation state
  const [bulkLocationId, setBulkLocationId] = useState(null);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkProxyCount, setBulkProxyCount] = useState(0);
  const [bulkTag, setBulkTag] = useState('');
  const [failedMoves, setFailedMoves] = useState([]);

  // Update allDisplayCards when cards prop changes
  useEffect(() => {
    if (cards.length > 0) {
      // Add new cards from search, avoid duplicates
      setAllDisplayCards(prev => {
        const existingIds = new Set(prev.map(card => card.id));
        const newCards = cards.filter(card => !existingIds.has(card.id));
        return [...prev, ...newCards];
      });
    }
  }, [cards]);

  // Sort cards
  const sortedCards = React.useMemo(() => {
    const toSort = [...allDisplayCards];

    toSort.sort((a, b) => {
      let result = 0;

      switch (sortMode) {
        case 'cost':
          result = (a.cost || 0) - (b.cost || 0);
          break;
        case 'type':
          result = (a.category || '').localeCompare(b.category || '');
          break;
        case 'rarity':
          const rarityOrder = { common: 1, uncommon: 2, rare: 3, 'super rare': 4, leader: 5 };
          result = (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
          break;
        case 'card_code':
          result = (a.card_code || '').localeCompare(b.card_code || '');
          break;
        default: // name
          result = (a.name || '').localeCompare(b.name || '');
      }

      return sortReverse ? -result : result;
    });

    return toSort;
  }, [allDisplayCards, sortMode, sortReverse]);

  // Card selection handlers
  const handleCardSelection = (cardId, isSelected) => {
    setSelectedCards(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(cardId);
      } else {
        newSelection.delete(cardId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (cards.length > 0 && cards.every(card => selectedCards.has(card.id))) {
      // Deselect current search results
      setSelectedCards(prev => {
        const newSelection = new Set(prev);
        cards.forEach(card => newSelection.delete(card.id));
        return newSelection;
      });
    } else {
      // Select current search results
      setSelectedCards(prev => {
        const newSelection = new Set(prev);
        cards.forEach(card => newSelection.add(card.id));
        return newSelection;
      });
    }
  };

  const handleClearAll = () => {
    setSelectedCards(new Set());
  };

  // Card interaction handlers
  const handleCardClick = (card) => {
    setSelectedCard(card);
    onCardDetailOpen();
  };

  const handleCardDetailUpdate = useCallback((cardId, updateData) => {
    // Update the card in allDisplayCards
    setAllDisplayCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, ...updateData } : card
      )
    );

    // Update selected card if it matches
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(prev => ({ ...prev, ...updateData }));
    }

    // Call parent callback if provided
    if (onCountUpdate) {
      onCountUpdate(cardId, updateData);
    }
  }, [selectedCard, onCountUpdate]);

  // Bulk operation handlers
  const handleBulkMoveLocation = useCallback(async () => {
    if (selectedCards.size === 0 || !bulkLocationId) return;

    const failed = [];
    const succeeded = [];

    try {
      for (const cardId of selectedCards) {
        try {
          if (onLocationUpdate) {
            await onLocationUpdate(cardId, bulkLocationId);
            succeeded.push(cardId);
          }
        } catch (error) {
          const card = allDisplayCards.find(c => c.id === cardId);
          failed.push({
            cardName: card?.name || 'Unknown',
            cardCode: card?.card_code || 'Unknown',
            reason: error.message || 'Unknown error'
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

    try {
      for (const cardId of selectedCards) {
        if (onCountUpdate) {
          await onCountUpdate(cardId, { owned_count: bulkCount });
        }
      }

      setAllDisplayCards(prev =>
        prev.map(card =>
          selectedCards.has(card.id) ? { ...card, owned_count: bulkCount } : card
        )
      );

      toast({
        title: 'Counts updated',
        description: `Updated counts for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

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
  }, [selectedCards, bulkCount, onCountUpdate, toast, onBulkCountClose]);

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

    try {
      for (const cardId of selectedCards) {
        if (onCountUpdate) {
          await onCountUpdate(cardId, { proxy_count: bulkProxyCount });
        }
      }

      setAllDisplayCards(prev =>
        prev.map(card =>
          selectedCards.has(card.id) ? { ...card, proxy_count: bulkProxyCount } : card
        )
      );

      toast({
        title: 'Proxy counts updated',
        description: `Updated proxy counts for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onBulkProxyClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedCards, bulkProxyCount, onCountUpdate, toast, onBulkProxyClose]);

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
      {/* Tabletop Canvas - Collapsible Box similar to Battle Tools */}
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="lg"
        overflow="hidden"
        w="100%" // Extend to full width
      >
        {/* Collapsible Header */}
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

        {/* Collapsible Content */}
        <Collapse in={isExpanded}>
          <Box p={3} borderTop="1px solid" borderColor={useColorModeValue('gray.200', 'gray.600')}>
            <VStack spacing={3}>
              {/* Controls */}
              <HStack spacing={4} wrap="wrap" justify="space-between" w="100%">
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

                  {/* Clear All Button - moved from header */}
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    leftIcon={<RepeatIcon />}
                    onClick={handleClearAll}
                    isDisabled={allDisplayCards.length === 0}
                  >
                    Clear All
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

              {/* Cards Display - Single row with horizontal scrolling */}
              <Box
                bg={useColorModeValue('gray.50', 'gray.700')}
                borderRadius="md"
                p={4}
                border="1px solid"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                w="100%"
              >
                {sortedCards.length === 0 ? (
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
                        >
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
                            height="100%"
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
                  </Flex>
                )}
              </Box>
            </VStack>
          </Box>
        </Collapse>
      </Box>

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
              <LocationSelector
                selectedLocationId={bulkLocationId}
                onLocationSelect={setBulkLocationId}
                showCreateNew={true}
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
                onClick={handleBulkMoveLocation}
                isDisabled={!bulkLocationId}
              >
                Move Cards
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Count Modal */}
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
                Setting count for {selectedCards.size} selected cards.
              </Text>
              <NumberInput
                value={bulkCount}
                onChange={(valueString) => setBulkCount(parseInt(valueString) || 0)}
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

      {/* Bulk Proxy Modal */}
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
                Setting proxy count for {selectedCards.size} selected cards.
              </Text>
              <NumberInput
                value={bulkProxyCount}
                onChange={(valueString) => setBulkProxyCount(parseInt(valueString) || 0)}
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

      {/* Bulk Tag Modal */}
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
                Setting tag for {selectedCards.size} selected cards.
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

      {/* Failed Move Modal */}
      <Modal isOpen={isFailedMoveOpen} onClose={onFailedMoveClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Move Results</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {failedMoves.length > 0 && (
                <>
                  <Text fontSize="md" fontWeight="semibold" color="red.600">
                    Failed to move {failedMoves.length} cards:
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
