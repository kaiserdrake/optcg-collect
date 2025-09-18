'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,

  Text,
  Box,
  Grid,
  Spinner,
  Input,
  useToast,
  IconButton,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure
} from '@chakra-ui/react';

import { SearchIcon, DeleteIcon } from '@chakra-ui/icons';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DeckCard = ({ deck, onLoad, onDelete, isSelected }) => {
  const handleLoadClick = (e) => {
    e.stopPropagation();
    onLoad(deck.id);
  };

  return (
    <Box
      p={4}
      borderRadius="md"

      border="2px"
      borderColor={isSelected ? "blue.400" : "gray.200"}
      bg={isSelected ? "blue.50" : "white"}
      _hover={{ borderColor: "blue.300", shadow: "md" }}
      transition="all 0.2s"
      position="relative"
    >
      <HStack spacing={4} align="start">
        {/* Deck Thumbnail */}
        {deck.thumbnail ? (
          <Box
            width="60px"
            height="60px"

            borderRadius="md"
            border="2px"
            borderColor="gray.300"
            overflow="hidden"
            position="relative"
            bg="white"
          >
            <CardImage
              src={deck.thumbnail}
              alt={deck.name}
              width="120px"
              height="168px"

              objectFit="cover"
              position="absolute"
              top="-15px"
              left="-30px"
            />
          </Box>
        ) : (
          <Box
            width="60px"
            height="60px"
            borderRadius="md"
            border="2px"
            borderColor="gray.300"
            overflow="hidden"
            position="relative"
            bg="white"
          >
            <CardImage
              src="/placeholder.png"
              alt="No thumbnail"
              width="120px"
              height="168px"
              objectFit="cover"
              position="absolute"
              top="-15px"
              left="-30px"
            />
          </Box>

        )}

        {/* Deck Info */}
        <VStack align="start" spacing={2} flex="1">
          <Text fontWeight="bold" noOfLines={1}>
            {deck.name}
          </Text>

          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.600">
              {deck.card_count || 0} unique • {deck.total_cards || 0} total
            </Text>

            {deck.updated_at && (
              <Text fontSize="xs" color="gray.500">
                Updated: {new Date(deck.updated_at).toLocaleDateString()}
              </Text>
            )}
          </VStack>
        </VStack>


        {/* Action Buttons */}
        <VStack spacing={2}>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleLoadClick}
          >
            Load
          </Button>

          <IconButton
            icon={<DeleteIcon />}
            size="sm"
            variant="outline"
            colorScheme="red"

            onClick={(e) => onDelete(deck, e)}
            aria-label="Delete deck"
          />
        </VStack>
      </HStack>
    </Box>
  );
};

const LoadDeckModal = ({ isOpen, onClose, onLoad }) => {
  const [decks, setDecks] = useState([]);
  const [filteredDecks, setFilteredDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);

  const toast = useToast();
  const cancelRef = useRef();

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Load decks when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDecks();
      setSearchTerm('');
      setSelectedDeckId(null);
    }
  }, [isOpen]);

  // Filter decks based on search term
  useEffect(() => {

    if (!searchTerm.trim()) {
      setFilteredDecks(decks);
    } else {
      const filtered = decks.filter(deck =>
        deck.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDecks(filtered);
    }
  }, [decks, searchTerm]);

  // NORMALIZE LOADED DECK - Converts backend format to consistent { card: {...}, count } format
  const normalizeLoadedDeck = React.useCallback((deckData) => {
    if (!deckData) return null;

    // Backend returns cards in format: { card: {...}, count }
    // But we need to ensure all cards have proper structure
    const normalizedCards = [];

    if (deckData.cards && Array.isArray(deckData.cards)) {
      deckData.cards.forEach(item => {
        // Backend should already return { card: {...}, count } format
        // But let's normalize just in case
        if (item.card && typeof item.card === 'object' && typeof item.count === 'number') {
          normalizedCards.push({
            card: { ...item.card },
            count: item.count

          });
        } else {
          console.warn('Invalid card structure from backend:', item);
        }
      });
    }

    return {
      id: deckData.id,
      name: deckData.name,
      thumbnail: deckData.thumbnail,
      location: deckData.location,
      created_at: deckData.created_at,
      updated_at: deckData.updated_at,
      cards: normalizedCards
    };
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/api/decks`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load decks');
      }

      const decksData = await response.json();
      setDecks(decksData);
    } catch (error) {
      console.error('Load decks error:', error);
      toast({
        title: 'Load failed',
        description: 'Unable to load saved decks',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);

    }
  };

  const handleLoadDeck = async (deckId) => {
    try {
      const response = await fetch(`${api}/api/decks/${deckId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load deck details');
      }

      const deckData = await response.json();

      // Normalize the loaded deck to ensure consistent structure
      const normalizedDeck = normalizeLoadedDeck(deckData);

      if (!normalizedDeck) {
        throw new Error('Invalid deck data received');
      }

      // Call onLoad with normalized deck data
      onLoad(normalizedDeck);

      // Close the modal after successful load
      onClose();
    } catch (error) {
      console.error('Load deck error:', error);
      toast({
        title: 'Load failed',
        description: 'Unable to load deck',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteRequest = (deck, event) => {
    event.stopPropagation();
    setDeckToDelete(deck);
    onDeleteOpen();
  };

  const handleDeleteCancel = () => {
    setDeckToDelete(null);
    onDeleteClose();

  };


  const handleDeleteConfirm = async () => {
    if (!deckToDelete) return;

    try {
      const response = await fetch(`${api}/api/decks/${deckToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }

      toast({
        title: 'Deck deleted',
        description: `"${deckToDelete.name}" has been deleted`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      // Refresh the decks list
      await loadDecks();

      // Close the delete dialog

      handleDeleteCancel();
    } catch (error) {
      console.error('Delete deck error:', error);
      toast({
        title: 'Delete failed',
        description: 'Unable to delete deck',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Load Deck</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Search */}
              <HStack>
                <Input
                  placeholder="Search decks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftElement={<SearchIcon color="gray.400" />}
                />
              </HStack>

              {/* Decks List */}
              {loading ? (
                <VStack spacing={4} py={8}>
                  <Spinner color="blue.500" />
                  <Text color="gray.600">Loading saved decks...</Text>
                </VStack>
              ) : filteredDecks.length === 0 ? (
                <VStack spacing={4} py={8}>
                  <Text color="gray.500" fontSize="lg">
                    {searchTerm ? 'No decks found' : 'No saved decks'}
                  </Text>
                  <Text color="gray.400" fontSize="sm" textAlign="center">
                    {searchTerm ? 'Try a different search term' : 'Save your first deck to see it here'}
                  </Text>
                </VStack>
              ) : (
                <Grid templateColumns="1fr" gap={3} maxH="400px" overflowY="auto">
                  {filteredDecks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      onLoad={handleLoadDeck}

                      onDelete={handleDeleteRequest}
                      isSelected={selectedDeckId === deck.id}
                    />
                  ))}
                </Grid>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>
              Cancel

            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleDeleteCancel}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.400" backdropFilter="blur(4px)">
          <AlertDialogContent>

            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Deck
            </AlertDialogHeader>

            <AlertDialogBody>
              {deckToDelete && (
                <VStack spacing={3} align="start">
                  <Text>
                    Are you sure you want to delete <strong>"{deckToDelete.name}"</strong>?
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    This action cannot be undone.
                  </Text>
                </VStack>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={handleDeleteCancel}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}

                ml={3}
              >
                Delete Deck
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default LoadDeckModal;
