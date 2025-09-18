'use client';

import React, { useState, useEffect } from 'react';
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
  Badge,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  Flex,
  Card,
  CardBody,
  SimpleGrid
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useAuth } from '@/context/AuthContext';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Utility function to parse deck content string into deck structure
const parseDeckContent = async (deckContent) => {
  if (!deckContent || typeof deckContent !== 'string') {
    return { cards: [] };
  }

  try {
    const response = await fetch(`${api}/api/public/decks/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckContent })
    });

    if (!response.ok) {
      throw new Error('Failed to parse deck content');
    }

    const parsedDeck = await response.json();
    return parsedDeck;
  } catch (error) {
    console.error('Error parsing deck content:', error);
    return { cards: [] };
  }
};

// Function to get first card image URL from deck content
const getFirstCardImageUrl = async (deckContent) => {
  if (!deckContent || typeof deckContent !== 'string') {
    return null;
  }

  try {
    const cardEntries = deckContent.split(',');
    if (cardEntries.length === 0) return null;

    const firstEntry = cardEntries[0].trim();
    const match = firstEntry.match(/^(\d+)x(.+)$/);
    if (!match) return null;

    const cardCode = match[2].trim();

    // Try authenticated search first, then fallback to public search
    let response = await fetch(`${api}/api/cards/search?keyword=id:${cardCode}`, {
      credentials: 'include'
    });

    // If authentication fails (401), try public API
    if (!response.ok && response.status === 401) {
      response = await fetch(`${api}/api/public/cards/search?keyword=id:${cardCode}`);
    }

    if (response.ok) {
      const searchResults = await response.json();
      if (searchResults.length > 0) {
        return searchResults[0].img_url;
      }
    }
  } catch (error) {
    console.error('Error getting first card image:', error);
  }

  return null;
};

const DeckCard = ({ deck, onSelect, isSelected, type }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstCardThumbnailUrl, setFirstCardThumbnailUrl] = useState(null);
  const toast = useToast();

  // Load first card thumbnail for published decks (they don't have deck thumbnails)
  useEffect(() => {
    if (type === 'published' && deck?.deck_content) {
      getFirstCardImageUrl(deck.deck_content).then(url => {
        setFirstCardThumbnailUrl(url);
      });
    }
  }, [deck, type]);

  const handleSelect = async () => {
    setIsLoading(true);

    try {
      if (type === 'published') {
        const parsedDeck = await parseDeckContent(deck.deck_content);
        const deckWithCards = {
          ...deck,
          name: deck.deck_title || 'Untitled Deck',
          cards: parsedDeck.cards || [],
          type: 'published'
        };
        onSelect(deckWithCards);
      } else {
        const response = await fetch(`${api}/api/decks/${deck.id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to load saved deck details: ${response.status}`);
        }

        const deckWithCards = await response.json();
        onSelect({
          ...deckWithCards,
          type: 'saved'
        });
      }
    } catch (error) {
      console.error('Error loading deck:', error);
      toast({
        title: 'Error loading deck',
        description: 'Failed to load deck content',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown';
      return new Date(dateString).toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return 'Unknown';
    }
  };

  const deckName = type === 'saved' ? (deck?.name || 'Untitled Deck') : (deck?.deck_title || 'Untitled Deck');
  const publisher = deck?.publisher || '';
  const date = formatDate(type === 'saved' ? deck?.updated_at : deck?.date_published);

  // Determine which thumbnail to show
  const getThumbnailImage = () => {
    if (type === 'saved') {
      // For saved decks, use deck thumbnail from database or placeholder
      return deck?.thumbnail || '/placeholder.png';
    } else {
      // For published decks, use first card thumbnail (no deck thumbnail stored)
      return firstCardThumbnailUrl;
    }
  };

  return (
    <Card
      variant={isSelected ? "filled" : "outline"}
      colorScheme={isSelected ? "blue" : undefined}
      cursor={isLoading ? "not-allowed" : "pointer"}
      onClick={isLoading ? undefined : handleSelect}
      _hover={{
        shadow: "md",
        borderColor: isSelected ? "blue.400" : "blue.300",
        transform: "translateY(-2px)"
      }}
      transition="all 0.2s"
      opacity={isLoading ? 0.7 : 1}
      position="relative"
      size="sm"
    >
      <CardBody p={3}>
        <VStack spacing={2} align="center">
          {/* Thumbnail */}
          <Box
            width="70px"
            height="98px"
            bg="gray.100"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            shadow="sm"
            position="relative"
          >
            {getThumbnailImage() ? (
              <CardImage
                src={getThumbnailImage()}
                alt={type === 'saved' ? 'Deck thumbnail' : 'First card thumbnail'}
                width="70px"
                height="98px"
                borderRadius="lg"
                fallbackSrc="/placeholder.png"
              />
            ) : (
                <VStack spacing={1}>
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    {type === 'saved' ? 'DECK' : 'PUB'}
                  </Text>
                </VStack>
              )}

            {/* Loading overlay */}
            {isLoading && (
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="blackAlpha.400"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="lg"
              >
                <Spinner color="white" size="sm" />
              </Box>
            )}
          </Box>

          {/* Deck Name */}
          <Text
            fontWeight="bold"
            fontSize="sm"
            textAlign="center"
            noOfLines={2}
            lineHeight="1.2"
            minH="2.4em"
            color="gray.800"
          >
            {deckName}
          </Text>

          {/* Publisher/Type */}
          <Box textAlign="center" minH="18px">
            {type === 'published' && publisher ? (
              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                By: {publisher}
              </Text>
            ) : (
              <Badge
                colorScheme={type === 'saved' ? 'blue' : 'green'}
                variant="subtle"
                size="sm"
              >
                {type === 'saved' ? 'Saved' : 'Published'}
              </Badge>
            )}
          </Box>

          {/* Date */}
          <Text fontSize="xs" color="gray.500">
            {type === 'saved' ? 'Updated' : 'Published'}: {date}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
};

const SelectDeckModal = ({ isOpen, onClose, onDeckSelected, playerNumber }) => {
  const [savedDecks, setSavedDecks] = useState([]);
  const [publishedDecks, setPublishedDecks] = useState([]);
  const [loading, setLoading] = useState({ saved: false, published: false });
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const { user } = useAuth();
  const toast = useToast();

  // Load saved decks
  const loadSavedDecks = async () => {
    if (!user) return;

    setLoading(prev => ({ ...prev, saved: true }));
    try {
      const response = await fetch(`${api}/api/decks`, {
        credentials: 'include'
      });

      if (response.ok) {
        const decks = await response.json();
        setSavedDecks(decks);
      }
    } catch (error) {
      console.error('Error loading saved decks:', error);
    } finally {
      setLoading(prev => ({ ...prev, saved: false }));
    }
  };

  // Load published decks
  const loadPublishedDecks = async () => {
    setLoading(prev => ({ ...prev, published: true }));
    try {
      const response = await fetch(`${api}/api/public/decks`);
      if (response.ok) {
        const decks = await response.json();
        setPublishedDecks(decks);
      }
    } catch (error) {
      console.error('Error loading published decks:', error);
    } finally {
      setLoading(prev => ({ ...prev, published: false }));
    }
  };

  // Load decks when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDeck(null);
      if (user) {
        loadSavedDecks();
      }
      loadPublishedDecks();
    }
  }, [isOpen, user]);

  // Filter decks by search term
  const filterDecks = (decks, type) => {
    if (!searchTerm) return decks;

    return decks.filter(deck => {
      const deckName = type === 'saved' ? deck.name : deck.deck_title;
      const publisher = deck.publisher || '';
      return (
        deckName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        publisher.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
  };

  const handleConfirmSelection = () => {
    if (selectedDeck && onDeckSelected) {
      onDeckSelected(selectedDeck);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedDeck(null);
    setSearchTerm('');
    onClose();
  };

  const filteredSavedDecks = filterDecks(savedDecks, 'saved');
  const filteredPublishedDecks = filterDecks(publishedDecks, 'published');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Select Deck for Player {playerNumber}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Search Bar */}
            <HStack spacing={2}>
              <SearchIcon color="gray.500" />
              <Input
                placeholder="Search decks by name or publisher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="md"
              />
            </HStack>

            {/* Tabs */}
            <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
              <TabList>
                {user && <Tab>My Saved Decks ({filteredSavedDecks.length})</Tab>}
                <Tab>Published Decks ({filteredPublishedDecks.length})</Tab>
              </TabList>

              <TabPanels>
                {/* Saved Decks Tab */}
                {user && (
                  <TabPanel px={0}>
                    {loading.saved ? (
                      <Flex justify="center" py={8}>
                        <Spinner size="lg" />
                      </Flex>
                    ) : (
                      <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
                        {filteredSavedDecks.map((deck) => (
                          <DeckCard
                            key={`saved-${deck.id}`}
                            deck={deck}
                            type="saved"
                            isSelected={selectedDeck?.id === deck.id && selectedDeck?.type === 'saved'}
                            onSelect={handleDeckSelect}
                          />
                        ))}
                      </SimpleGrid>
                    )}

                    {!loading.saved && filteredSavedDecks.length === 0 && (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.500">
                          {searchTerm ? 'No decks found matching your search.' : 'No saved decks found.'}
                        </Text>
                      </Box>
                    )}
                  </TabPanel>
                )}

                {/* Published Decks Tab */}
                <TabPanel px={0}>
                  {loading.published ? (
                    <Flex justify="center" py={8}>
                      <Spinner size="lg" />
                    </Flex>
                  ) : (
                    <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
                      {filteredPublishedDecks.map((deck) => (
                        <DeckCard
                          key={`published-${deck.id}`}
                          deck={deck}
                          type="published"
                          isSelected={selectedDeck?.id === deck.id && selectedDeck?.type === 'published'}
                          onSelect={handleDeckSelect}
                        />
                      ))}
                    </SimpleGrid>
                  )}

                  {!loading.published && filteredPublishedDecks.length === 0 && (
                    <Box textAlign="center" py={8}>
                      <Text color="gray.500">
                        {searchTerm ? 'No decks found matching your search.' : 'No published decks found.'}
                      </Text>
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose} mr={3}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleConfirmSelection}
            isDisabled={!selectedDeck}
          >
            Select Deck
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SelectDeckModal;
