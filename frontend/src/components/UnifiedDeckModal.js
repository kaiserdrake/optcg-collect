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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  IconButton,
  Badge,
  Flex,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Card,
  CardBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FiTrash2, FiUser, FiCalendar, FiDatabase, FiFolder, FiLayers, FiPlay, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Function to get first card image URL from deck content (for published decks)
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
      const searchData = await response.json();

      // Handle both new paginated response format and legacy format
      const searchResults = Array.isArray(searchData) ? searchData : searchData.results || [];

      if (searchResults.length > 0) {
        return searchResults[0].img_url;
      }
    }
  } catch (error) {
    console.error('Error getting first card image:', error);
  }

  return null;
};

// Function to get first card image URL by loading saved deck details
const getFirstCardImageFromSavedDeck = async (deckId) => {
  try {
    const response = await fetch(`${api}/api/decks/${deckId}`, {
      credentials: 'include'
    });

    if (response.ok) {
      const deckWithCards = await response.json();
      if (deckWithCards.cards && deckWithCards.cards.length > 0) {
        const firstCard = deckWithCards.cards[0];
        return firstCard.card?.img_url || null;
      }
    }
  } catch (error) {
    console.error('Error getting first card image from saved deck:', error);
  }
  return null;
};

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

const DeckCard = ({ deck, onSelect, onDelete, canDelete, isSelected, type, context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstCardThumbnailUrl, setFirstCardThumbnailUrl] = useState(null);
  const toast = useToast();

  const isPublished = type === 'published';

  // Load first card thumbnail for published decks OR saved decks without thumbnails
  useEffect(() => {
    if (isPublished && deck?.deck_content) {
      // For published decks, use deck_content to get first card image
      getFirstCardImageUrl(deck.deck_content).then(url => {
        setFirstCardThumbnailUrl(url);
      });
    } else if (!isPublished && !deck?.thumbnail && deck?.id) {
      // For saved decks without thumbnails, fetch deck details to get first card image
      getFirstCardImageFromSavedDeck(deck.id).then(url => {
        setFirstCardThumbnailUrl(url);
      });
    }
  }, [deck, isPublished]);

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown';
      return new Date(dateString).toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return 'Unknown';
    }
  };

  const deckName = isPublished ? (deck?.deck_title || 'Untitled Deck') : (deck?.name || 'Untitled Deck');
  const publisher = deck?.publisher || '';
  const date = formatDate(isPublished ? deck?.date_published : deck?.updated_at);

  // Determine which thumbnail to show
  const getThumbnailImage = () => {
    if (!isPublished) {
      // For saved decks, use deck thumbnail from database first, then first card thumbnail, then placeholder
      return deck?.thumbnail || firstCardThumbnailUrl || '/placeholder.png';
    } else {
      // For published decks, use first card thumbnail (no deck thumbnail stored)
      return firstCardThumbnailUrl || '/placeholder.png';
    }
  };

  const handleSelect = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isPublished) {
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

  const handleDelete = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onDelete(deck);
    } catch (error) {
      console.error('Error deleting deck:', error);
    } finally {
      setIsLoading(false);
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
            {getThumbnailImage() && getThumbnailImage() !== '/placeholder.png' ? (
              <CardImage
                src={getThumbnailImage()}
                alt={isPublished ? 'First card thumbnail' : 'Deck thumbnail'}
                width="140px"  // 2x the container width for zoom
                height="196px" // 2x the proportional height (70px * 2.8 aspect ratio)
                objectFit="cover"
                position="absolute"
                top="-14px"    // Focus on middle-top portion (20% of height)
                left="-35px"   // Center horizontally (50% of width difference)
                borderRadius="lg"
              />
            ) : (
              <VStack spacing={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="bold">
                  {isPublished ? 'PUB' : 'DECK'}
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
            {isPublished && publisher ? (
              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                By: {publisher}
              </Text>
            ) : (
              <Badge
                colorScheme={isPublished ? 'green' : 'blue'}
                variant="subtle"
                size="sm"
              >
                {isPublished ? 'Published' : 'Saved'}
              </Badge>
            )}
          </Box>

          {/* Date */}
          <Text fontSize="xs" color="gray.500">
            {isPublished ? `Published: ${date}` : `Updated: ${date}`}
          </Text>

          {/* Delete Button - Only show if canDelete and not in MatchUp context */}
          {canDelete && context !== 'matchup' && (
            <IconButton
              aria-label="Delete deck"
              icon={<FiTrash2 />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              position="absolute"
              top="8px"
              right="8px"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              isLoading={isLoading}
            />
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

const UnifiedDeckModal = ({
  isOpen,
  onClose,
  onSelect,
  context = 'navbar', // 'navbar', 'deckbuilder', 'matchup'
  selectedDeck = null,
  title = 'Select Deck'
}) => {
  const { user } = useAuth();
  const toast = useToast();

  // State management
  const [myDecks, setMyDecks] = useState([]);
  const [publishedDecks, setPublishedDecks] = useState([]);
  const [filteredMyDecks, setFilteredMyDecks] = useState([]);
  const [filteredPublishedDecks, setFilteredPublishedDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [myDecksSearchTerm, setMyDecksSearchTerm] = useState('');
  const [publishedDecksSearchTerm, setPublishedDecksSearchTerm] = useState('');
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDeckId, setSelectedDeckId] = useState(selectedDeck?.id || null);

  // Modal control for delete confirmation
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();

  // Load decks when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAllDecks();
      setMyDecksSearchTerm('');
      setPublishedDecksSearchTerm('');
      setSelectedDeckId(selectedDeck?.id || null);
    }
  }, [isOpen, user, selectedDeck]);

  // Filter my decks based on search term
  useEffect(() => {
    if (!myDecksSearchTerm.trim()) {
      setFilteredMyDecks(myDecks);
    } else {
      const filtered = myDecks.filter(deck =>
        deck.name.toLowerCase().includes(myDecksSearchTerm.toLowerCase())
      );
      setFilteredMyDecks(filtered);
    }
  }, [myDecks, myDecksSearchTerm]);

  // Filter published decks based on search term
  useEffect(() => {
    if (!publishedDecksSearchTerm.trim()) {
      setFilteredPublishedDecks(publishedDecks);
    } else {
      const filtered = publishedDecks.filter(deck =>
        deck.deck_title.toLowerCase().includes(publishedDecksSearchTerm.toLowerCase()) ||
        deck.publisher.toLowerCase().includes(publishedDecksSearchTerm.toLowerCase())
      );
      setFilteredPublishedDecks(filtered);
    }
  }, [publishedDecks, publishedDecksSearchTerm]);

  const loadAllDecks = async () => {
    setLoading(true);
    try {
      // Load both my decks and published decks in parallel
      const [myDecksResponse, publishedDecksResponse] = await Promise.all([
        fetch(`${api}/api/decks`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch(`${api}/api/public/decks`, {
          method: 'GET',
          credentials: 'include',
        })
      ]);

      if (myDecksResponse.ok) {
        const myDecksData = await myDecksResponse.json();
        setMyDecks(myDecksData);
      } else {
        console.error('Failed to load my decks');
        setMyDecks([]);
      }

      if (publishedDecksResponse.ok) {
        const publishedDecksData = await publishedDecksResponse.json();
        setPublishedDecks(publishedDecksData);
      } else {
        console.error('Failed to load published decks');
        setPublishedDecks([]);
      }

    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load decks. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setMyDecks([]);
      setPublishedDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = (deck) => {
    setDeckToDelete(deck);
    onDeleteOpen();
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeletingDeck(true);
    try {
      // Determine if it's a published deck or my deck
      const isPublishedDeck = 'deck_title' in deckToDelete;
      const endpoint = isPublishedDeck
        ? `/api/public/decks/${deckToDelete.id}`
        : `/api/decks/${deckToDelete.id}`;

      const response = await fetch(`${api}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Deck deleted',
          description: `"${isPublishedDeck ? deckToDelete.deck_title : deckToDelete.name}" has been deleted successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh the appropriate deck list
        if (isPublishedDeck) {
          setPublishedDecks(prev => prev.filter(deck => deck.id !== deckToDelete.id));
        } else {
          setMyDecks(prev => prev.filter(deck => deck.id !== deckToDelete.id));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete deck');
      }
    } catch (error) {
      console.error('Delete deck error:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete the deck. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeletingDeck(false);
      onDeleteClose();
      setDeckToDelete(null);
    }
  };

  const handleDeckSelect = async (deck) => {
    setSelectedDeckId(deck.id);

    if (context === 'navbar') {
      // Don't close modal yet, let user choose destination
      return;
    } else {
      // For DeckBuilder context, we need to ensure we have full deck details
      if (context === 'deckbuilder') {
        try {
          // Check if this is a saved deck that needs full details
          if (deck.type === 'saved' || (!deck.type && !deck.deck_content)) {
            const response = await fetch(`${api}/api/decks/${deck.id}`, {
              credentials: 'include'
            });

            if (response.ok) {
              const fullDeckData = await response.json();
              onSelect(fullDeckData);
            } else {
              throw new Error('Failed to load full deck details');
            }
          } else {
            // Published deck, already has full data from parsing
            onSelect(deck);
          }
        } catch (error) {
          console.error('Error loading full deck details:', error);
          toast({
            title: 'Error loading deck',
            description: 'Failed to load complete deck data',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      } else {
        // For MatchUp, use deck as-is
        onSelect(deck);
      }

      onClose();
    }
  };

  const handleLoadInMatchUp = async () => {
    if (!selectedDeckId) return;

    const selectedFromMyDecks = filteredMyDecks.find(deck => deck.id === selectedDeckId);
    const selectedFromPublished = filteredPublishedDecks.find(deck => deck.id === selectedDeckId);
    const deck = selectedFromMyDecks || selectedFromPublished;

    if (deck) {
      if (context === 'navbar') {
        // Navigate to MatchUp page with deck parameters
        const deckContent = deck.deck_content || await generateDeckContentForNavigation(deck);
        if (deckContent) {
          window.location.href = `/?tab=matchup&deck=${encodeURIComponent(deckContent)}`;
        }
      } else {
        onSelect(deck, 'matchup');
      }
      onClose();
    }
  };

  const handleLoadInDeckBuilder = async () => {
    if (!selectedDeckId) return;

    const selectedFromMyDecks = filteredMyDecks.find(deck => deck.id === selectedDeckId);
    const selectedFromPublished = filteredPublishedDecks.find(deck => deck.id === selectedDeckId);
    const deck = selectedFromMyDecks || selectedFromPublished;

    if (deck) {
      if (context === 'navbar') {
        // Navigate to DeckBuilder page and trigger deck loading
        window.location.href = `/?tab=decks&loadDeck=${deck.id}`;
      } else {
        try {
          // For DeckBuilder context, we need full deck details
          if (selectedFromMyDecks) {
            // Saved deck - fetch full details
            const response = await fetch(`${api}/api/decks/${deck.id}`, {
              credentials: 'include'
            });

            if (response.ok) {
              const fullDeckData = await response.json();
              onSelect(fullDeckData, 'deckbuilder');
            } else {
              throw new Error('Failed to load full deck details');
            }
          } else {
            // Published deck - already parsed with full data
            onSelect(deck, 'deckbuilder');
          }
        } catch (error) {
          console.error('Error loading deck for DeckBuilder:', error);
          toast({
            title: 'Error loading deck',
            description: 'Failed to load complete deck data',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }
      onClose();
    }
  };

  // Helper function to generate deck content string for navigation
  const generateDeckContentForNavigation = async (deck) => {
    try {
      if (deck.deck_content) {
        return deck.deck_content; // Published deck
      } else if (deck.id) {
        // Saved deck - need to fetch full details and generate content string
        const response = await fetch(`${api}/api/decks/${deck.id}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const fullDeck = await response.json();
          if (fullDeck.cards && fullDeck.cards.length > 0) {
            return fullDeck.cards
              .map(item => `${item.count}x${item.card.id}`)
              .join(',');
          }
        }
      }
    } catch (error) {
      console.error('Error generating deck content for navigation:', error);
    }
    return null;
  };

  // Check if user can delete a deck
  const canDeleteMyDeck = (deck) => {
    return user && deck.user_id === user.id;
  };

  const canDeletePublishedDeck = (deck) => {
    return user && (user.role === 'admin' || deck.publisher === user.username);
  };

  // Get appropriate title based on context
  const getModalTitle = () => {
    switch (context) {
      case 'deckbuilder':
        return 'Load Deck in Deck Builder';
      case 'matchup':
        return 'Select Deck for Match Up';
      case 'navbar':
      default:
        return title;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent maxH="90vh" overflow="hidden">
          <ModalHeader pb={3}>
            <VStack spacing={2} align="start">
              <HStack spacing={3}>
                <Icon as={FiLayers} fontSize="xl" color="blue.500" />
                <Text fontSize="xl" fontWeight="bold">
                  {getModalTitle()}
                </Text>
              </HStack>
              {context === 'navbar' && (
                <Text fontSize="sm" color="gray.600">
                  Select a deck and choose where to open it
                </Text>
              )}
            </VStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody px={6} py={4} overflow="auto">
            <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
              <TabList mb={4}>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiUser} />
                    <Text>My Decks</Text>
                    <Badge variant="subtle" colorScheme="blue">{filteredMyDecks.length}</Badge>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiDatabase} />
                    <Text>Published Decks</Text>
                    <Badge variant="subtle" colorScheme="green">{filteredPublishedDecks.length}</Badge>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* My Decks Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Search */}
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search your decks..."
                        value={myDecksSearchTerm}
                        onChange={(e) => setMyDecksSearchTerm(e.target.value)}
                        bg="white"
                      />
                    </InputGroup>

                    {/* Decks Grid */}
                    <Box minH="200px" maxH="400px" overflow="auto">
                      {loading ? (
                        <Flex justify="center" py={8}>
                          <Spinner size="lg" color="blue.500" />
                        </Flex>
                      ) : filteredMyDecks.length === 0 ? (
                        <Flex
                          direction="column"
                          align="center"
                          justify="center"
                          py={12}
                          textAlign="center"
                        >
                          <Icon as={FiFolder} fontSize="3xl" color="gray.400" mb={4} />
                          <Text fontSize="lg" fontWeight="medium" color="gray.600" mb={2}>
                            {myDecksSearchTerm ? 'No matching decks found' : 'No saved decks yet'}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {myDecksSearchTerm
                              ? 'Try adjusting your search terms'
                              : 'Create and save your first deck to see it here'
                            }
                          </Text>
                        </Flex>
                      ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing={4}>
                          {filteredMyDecks.map((deck) => (
                            <DeckCard
                              key={deck.id}
                              deck={deck}
                              onSelect={handleDeckSelect}
                              onDelete={handleDeleteDeck}
                              canDelete={canDeleteMyDeck(deck)}
                              isSelected={selectedDeckId === deck.id}
                              type="saved"
                              context={context}
                            />
                          ))}
                        </SimpleGrid>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Published Decks Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Search */}
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search published decks..."
                        value={publishedDecksSearchTerm}
                        onChange={(e) => setPublishedDecksSearchTerm(e.target.value)}
                        bg="white"
                      />
                    </InputGroup>

                    {/* Decks Grid */}
                    <Box minH="200px" maxH="400px" overflow="auto">
                      {loading ? (
                        <Flex justify="center" py={8}>
                          <Spinner size="lg" color="green.500" />
                        </Flex>
                      ) : filteredPublishedDecks.length === 0 ? (
                        <Flex
                          direction="column"
                          align="center"
                          justify="center"
                          py={12}
                          textAlign="center"
                        >
                          <Icon as={FiDatabase} fontSize="3xl" color="gray.400" mb={4} />
                          <Text fontSize="lg" fontWeight="medium" color="gray.600" mb={2}>
                            {publishedDecksSearchTerm ? 'No matching published decks found' : 'No published decks available'}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {publishedDecksSearchTerm
                              ? 'Try adjusting your search terms'
                              : 'Published decks from the community will appear here'
                            }
                          </Text>
                        </Flex>
                      ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing={4}>
                          {filteredPublishedDecks.map((deck) => (
                            <DeckCard
                              key={deck.id}
                              deck={deck}
                              onSelect={handleDeckSelect}
                              onDelete={handleDeleteDeck}
                              canDelete={canDeletePublishedDeck(deck)}
                              isSelected={selectedDeckId === deck.id}
                              type="published"
                              context={context}
                            />
                          ))}
                        </SimpleGrid>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200">
            <Flex
              direction={{ base: selectedDeckId && context === 'navbar' ? 'column' : 'row', sm: 'row' }}
              width="100%"
              gap={3}
              align="stretch"
            >
              <Button onClick={onClose} variant="outline" order={{ base: 3, sm: 1 }}>
                Cancel
              </Button>

              {context === 'navbar' && selectedDeckId && (
                <>
                  <Button
                    leftIcon={<FiPlay />}
                    colorScheme="green"
                    onClick={handleLoadInMatchUp}
                    flex="1"
                    order={{ base: 1, sm: 2 }}
                    size="md"
                    fontWeight="semibold"
                    _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                  >
                    To MatchUp
                  </Button>
                  <Button
                    leftIcon={<FiEdit3 />}
                    colorScheme="blue"
                    onClick={handleLoadInDeckBuilder}
                    flex="1"
                    order={{ base: 2, sm: 3 }}
                    size="md"
                    fontWeight="semibold"
                    _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                  >
                    To Builder
                  </Button>
                </>
              )}

              {context !== 'navbar' && selectedDeckId && (
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    const selectedFromMyDecks = filteredMyDecks.find(deck => deck.id === selectedDeckId);
                    const selectedFromPublished = filteredPublishedDecks.find(deck => deck.id === selectedDeckId);
                    const deck = selectedFromMyDecks || selectedFromPublished;
                    if (deck) {
                      handleDeckSelect(deck);
                    }
                  }}
                  flex="1"
                  fontWeight="semibold"
                  _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                >
                  {context === 'deckbuilder' ? 'Load in Deck Builder' : 'Select for Match Up'}
                </Button>
              )}
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Deck
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{deckToDelete?.deck_title || deckToDelete?.name}"?
              <br />
              <Text fontSize="sm" color="gray.600" mt={2}>
                This action cannot be undone.
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={onDeleteClose}
                isDisabled={isDeletingDeck}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDeleteDeck}
                ml={3}
                isLoading={isDeletingDeck}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default UnifiedDeckModal;
