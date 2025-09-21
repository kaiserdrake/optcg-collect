'use client';

import React, { useState, useMemo } from 'react';
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
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FiSearch, FiHash, FiType, FiTag, FiMapPin, FiSettings } from 'react-icons/fi';
import DeckCard from './DeckCard';
import CardDetailModal from './CardDetailModal';

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

  const [sortMode, setSortMode] = useState('name');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(80);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [selectedCard, setSelectedCard] = useState(null);

  // Bulk operation states
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkProxyCount, setBulkProxyCount] = useState(0);
  const [bulkTag, setBulkTag] = useState('');

  const toast = useToast();

  // Sort cards
  const sortedCards = useMemo(() => {
    if (!Array.isArray(cards) || cards.length === 0) {
      return [];
    }

    const sorted = [...cards].sort((a, b) => {
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
  }, [cards, sortMode, sortReverse]);

  // Handle card click to open detail modal
  const handleCardClick = (card) => {
    setSelectedCard(card);
    onCardDetailOpen();
    if (onCardClick) {
      onCardClick(card);
    }
  };

  // Handle card selection for bulk operations
  const handleCardSelection = (cardId, isSelected) => {
    const newSelected = new Set(selectedCards);
    if (isSelected) {
      newSelected.add(cardId);
    } else {
      newSelected.delete(cardId);
    }
    setSelectedCards(newSelected);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedCards.size === sortedCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(sortedCards.map(card => card.id)));
    }
  };

  // Bulk operations
  const handleBulkMoveLocation = async () => {
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
      // Implement bulk location update logic
      for (const cardId of selectedCards) {
        if (onLocationUpdate) {
          await onLocationUpdate(cardId, bulkLocation);
        }
      }

      toast({
        title: 'Location updated',
        description: `Updated location for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedCards(new Set());
      onBulkMoveClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update location',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBulkSetCount = async () => {
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

      toast({
        title: 'Count updated',
        description: `Updated count for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedCards(new Set());
      onBulkCountClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update count',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBulkSetProxyCount = async () => {
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

      toast({
        title: 'Proxy count updated',
        description: `Updated proxy count for ${selectedCards.size} cards`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedCards(new Set());
      onBulkProxyClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update proxy count',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBulkSetTag = async () => {
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

      setSelectedCards(new Set());
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
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack
        justify="space-between"
        align="center"
        cursor="pointer"
        onClick={onToggle}
        p={3}
        borderRadius="md"
        bg="gray.50"
        _hover={{ bg: "gray.100" }}
        transition="background-color 0.2s"
      >
        <HStack spacing={3}>
          <IconButton
            icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="sm"
            variant="ghost"
          />
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              Tabletop
            </Text>
            <Text fontSize="sm" color="gray.600">
              {sortedCards.length} cards
            </Text>
          </VStack>
        </HStack>

        <Badge colorScheme="blue" variant="outline">
          {selectedCards.size} selected
        </Badge>
      </HStack>

      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={4} align="stretch">
          {/* Controls */}
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flexWrap="wrap">
              {/* Sort Controls */}
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={
                    sortMode === 'cost' ? <FiHash /> :
                    sortMode === 'name' ? <FiSearch /> :
                    sortMode === 'type' ? <FiType /> :
                    sortMode === 'rarity' ? <FiTag /> :
                    <FiSearch />
                  }
                  size="sm"
                  variant="outline"
                />
                <MenuList>
                  <MenuItem onClick={() => setSortMode('name')}>
                    <FiSearch style={{ marginRight: '8px' }} />
                    Name
                  </MenuItem>
                  <MenuItem onClick={() => setSortMode('cost')}>
                    <FiHash style={{ marginRight: '8px' }} />
                    Cost
                  </MenuItem>
                  <MenuItem onClick={() => setSortMode('type')}>
                    <FiType style={{ marginRight: '8px' }} />
                    Type
                  </MenuItem>
                  <MenuItem onClick={() => setSortMode('rarity')}>
                    <FiTag style={{ marginRight: '8px' }} />
                    Rarity
                  </MenuItem>
                  <MenuItem onClick={() => setSortMode('card_code')}>
                    <FiHash style={{ marginRight: '8px' }} />
                    Card Code
                  </MenuItem>
                </MenuList>
              </Menu>

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
                  min={60}
                  max={160}
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
                {selectedCards.size === sortedCards.length ? 'Deselect All' : 'Select All'}
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

          {/* Cards Grid */}
          <Box
            bg="gray.50"
            borderRadius="md"
            p={4}
            border="1px solid"
            borderColor="gray.200"
            minH="300px"
          >
            {sortedCards.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No cards in tabletop</Text>
              </Box>
            ) : (
              <Grid
                templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`}
                gap={4}
                justifyItems="center"
              >
                {sortedCards.map((card) => {
                  const isSelected = selectedCards.has(card.id);

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

                      {/* Card */}
                      <Box
                        border={isSelected ? "2px solid" : "1px solid"}
                        borderColor={isSelected ? "blue.400" : "transparent"}
                        borderRadius="md"
                        transition="all 0.2s"
                      >
                        <DeckCard
                          item={{ card, count: card.owned_count || 1 }}
                          onCardClick={handleCardClick}
                          isViewOnly={false}
                          thumbnailSize={thumbnailSize}
                          hideCount={true}
                        />
                      </Box>
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
      />

      {/* Bulk Move Location Modal */}
      <Modal isOpen={isBulkMoveOpen} onClose={onBulkMoveClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bulk Move Location</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                value={bulkLocation}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="Enter location name"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onBulkMoveClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleBulkMoveLocation}>
              Update {selectedCards.size} cards
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
    </VStack>
  );
};

export default TabletopCanvas;
