'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  VStack,

  Text,
  FormControl,
  FormLabel,
  useToast,
  HStack,
  Box
} from '@chakra-ui/react';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SaveDeckModal = ({ isOpen, onClose, deck, onSave }) => {
  const [deckName, setDeckName] = useState(deck.name || 'New Deck');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveAsLoading, setIsSaveAsLoading] = useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setDeckName(deck.name || 'New Deck');
    }
  }, [isOpen, deck.name]);

  // Ensures consistent { card: {...}, count } structure
  const normalizeCardItem = React.useCallback((item) => {
    if (!item) return null;

    // If item already has the correct structure: { card: {...}, count }
    if (item.card && typeof item.card === 'object' && typeof item.count === 'number') {
      return {
        card: { ...item.card },
        count: item.count
      };
    }

    // If item is a flat card object with count: { id, name, category, ..., count }
    if (typeof item.count === 'number' && (item.id || item.card_code)) {

      const { count, ...cardData } = item;
      return {
        card: { ...cardData },
        count: count
      };
    }

    // If item is just a card object without count, default count to 1
    if (item.id || item.card_code) {
      return {
        card: { ...item },
        count: 1
      };
    }

    return null;
  }, []);

  // Ensures card has required fields for backend
  const validateCardData = React.useCallback((card) => {
    if (!card) return false;

    // Backend requires: card_id, card_code, count
    const hasId = card.id || card.card_id;
    const hasCardCode = card.card_code;

    return hasId && hasCardCode;
  }, []);

  const validateDeck = React.useCallback(() => {
    if (!deckName.trim()) {
      toast({
        title: 'Invalid name',
        description: 'Deck name cannot be empty',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }

    if (!deck.cards || deck.cards.length === 0) {
      toast({
        title: 'Empty deck',
        description: 'Cannot save an empty deck',
        status: 'error',
        duration: 3000,

        isClosable: true,
      });
      return false;
    }

    // Normalize all cards and check validity
    const normalizedCards = deck.cards
      .map(item => normalizeCardItem(item))
      .filter(item => item && item.card && validateCardData(item.card));

    if (normalizedCards.length === 0) {
      toast({
        title: 'Invalid deck data',
        description: 'No valid cards found in deck',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }

    // Check for leader
    const hasLeader = normalizedCards.some(item => {
      return item.card && item.card.category === 'LEADER';
    });

    if (!hasLeader) {
      toast({
        title: 'No leader',
        description: 'Deck must have a leader to save',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }

    return true;
  }, [deckName, deck.cards, normalizeCardItem, validateCardData, toast]);

  const saveDeck = async (saveAsNew = false) => {
    if (!validateDeck()) return;

    const setLoadingState = saveAsNew ? setIsSaveAsLoading : setIsLoading;
    setLoadingState(true);

    try {
      // Normalize and validate all cards
      const normalizedCards = deck.cards
        .map(item => normalizeCardItem(item))
        .filter(item => item && item.card && validateCardData(item.card));

      if (normalizedCards.length === 0) {
        throw new Error('No valid cards found in deck');
      }

      // Convert to backend API format: { card_id, card_code, count }
      const apiCards = normalizedCards.map(item => {
        const card = item.card;
        return {
          card_id: card.id || card.card_id, // Handle both id formats
          card_code: card.card_code,
          count: item.count
        };
      });

      // Validate API cards have all required fields
      const invalidCards = apiCards.filter(item => !item.card_id || !item.card_code || !item.count);
      if (invalidCards.length > 0) {
        console.error('Invalid cards for API:', invalidCards);
        throw new Error(`${invalidCards.length} cards missing required data (card_id, card_code, or count)`);
      }

      const deckData = {
        name: deckName.trim(),
        thumbnail: deck.thumbnail,
        cards: apiCards,
        location: deck.location?.id || deck.location // Handle both object and id formats
      };

      const isUpdate = deck.id && !saveAsNew;
      const url = isUpdate ? `${api}/api/decks/${deck.id}` : `${api}/api/decks`;
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(deckData),
      });

      if (response.ok) {
        const savedDeck = await response.json();

        // Call the onSave callback with the saved deck metadata
        if (onSave) {
          onSave(savedDeck);
        }

        const actionText = saveAsNew ? 'saved as new deck' : (isUpdate ? 'updated' : 'saved');
        toast({
          title: saveAsNew ? 'Deck saved as new' : (isUpdate ? 'Deck updated' : 'Deck saved'),
          description: `"${savedDeck.name}" has been ${actionText}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;

        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Save deck error:', error);

      const actionText = saveAsNew ? 'save deck as new' : (deck.id && !saveAsNew ? 'update deck' : 'save deck');
      toast({
        title: saveAsNew ? 'Save as new failed' : (deck.id && !saveAsNew ? 'Update failed' : 'Save failed'),
        description: `Could not ${actionText}. ${error.message || 'Please try again.'}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingState(false);
    }
  };

  // SAFE stats calculation with normalization
  const stats = React.useMemo(() => {
    if (!deck.cards || deck.cards.length === 0) {
      return {
        hasLeader: false,
        cardCount: 0,
        uniqueCards: 0
      };
    }

    const normalizedCards = deck.cards
      .map(item => normalizeCardItem(item))
      .filter(item => item && item.card);

    if (normalizedCards.length === 0) {
      return {
        hasLeader: false,
        cardCount: 0,
        uniqueCards: 0
      };
    }

    const leader = normalizedCards.find(item => {
      return item.card && item.card.category === 'LEADER';
    });

    const nonLeaderCards = normalizedCards.filter(item => {
      return item.card && item.card.category !== 'LEADER';
    });

    const cardCount = nonLeaderCards.reduce((sum, item) => sum + (item.count || 0), 0);

    return {
      hasLeader: !!leader,
      cardCount,
      uniqueCards: normalizedCards.length
    };
  }, [deck.cards, normalizeCardItem]);

  const isFormValid = stats.hasLeader && stats.cardCount <= 50 && deckName.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>

          {deck.id ? 'Update Deck' : 'Save New Deck'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Deck Preview */}
            <HStack spacing={4} p={3} bg="gray.50" borderRadius="md">
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
                    alt="Deck thumbnail"
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
                    alt="No thumbnail selected"

                    width="120px"
                    height="168px"
                    objectFit="cover"
                    position="absolute"

                    top="-15px"
                    left="-30px"
                  />
                </Box>
              )}

              <VStack align="start" spacing={1} flex="1">

                <Text fontSize="sm" color="gray.600">
                  {stats.uniqueCards} unique cards • {stats.cardCount} total
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {stats.hasLeader ? 'Has leader' : 'No leader'}
                </Text>
              </VStack>
            </HStack>

            {/* Deck Name Input */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium">Deck Name</FormLabel>
              <Input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name"
                autoFocus
              />
            </FormControl>

            {/* Validation Messages */}
            {!stats.hasLeader && (
              <Text fontSize="sm" color="red.500">
                ⚠ Deck must have a leader to save
              </Text>
            )}

            {stats.cardCount > 50 && (
              <Text fontSize="sm" color="red.500">
                ⚠ Deck has {stats.cardCount} cards (maximum is 50)
              </Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={onClose}>

              Cancel
            </Button>

            {deck.id && (
              <Button

                variant="outline"
                colorScheme="blue"
                onClick={() => saveDeck(true)}
                isLoading={isSaveAsLoading}
                loadingText="Saving..."
                isDisabled={!isFormValid}
              >
                Save as New
              </Button>
            )}

            <Button
              colorScheme="blue"
              onClick={() => saveDeck(false)}
              isLoading={isLoading}
              loadingText={deck.id ? "Updating..." : "Saving..."}
              isDisabled={!isFormValid}
            >
              {deck.id ? 'Update Deck' : 'Save Deck'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};


export default SaveDeckModal;
