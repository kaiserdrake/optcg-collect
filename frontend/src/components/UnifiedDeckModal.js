'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
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
  SimpleGrid,
  Icon,
  Card,
  CardBody,
  Tooltip,
  Button
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiTrash2, FiUser, FiDatabase, FiFolder, FiLayers, FiPlay, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Function to get first card image URL from already parsed deck data (for published decks)
const getFirstCardImageFromParsedDeck = (deck) => {
  // For published decks, we already have parsedDeck.cards available
  if (deck.parsedDeck && deck.parsedDeck.cards && deck.parsedDeck.cards.length > 0) {
    const firstCard = deck.parsedDeck.cards[0];
    return firstCard.card?.img_url || null;
  }
  return null;
};

// Function to get first card image URL from deck content (for published decks) - FALLBACK ONLY
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

    const cardId = match[2].trim(); // This is the card ID, not card_code

    // Try authenticated search first, then fallback to public search
    let response = await fetch(`${api}/api/cards/search?keyword=id:${cardId}`, {
      credentials: 'include'
    });

    // If authentication fails (401), try public API
    if (!response.ok && response.status === 401) {
      response = await fetch(`${api}/api/public/cards/search?keyword=id:${cardId}`);
    }

    if (response.ok) {
      const searchData = await response.json();

      // Handle both new paginated response format and legacy format
      const searchResults = Array.isArray(searchData) ?
        searchData : (searchData.results || searchData.cards || []);

      if (searchResults.length > 0) {
        // Find the card with the exact ID, or fallback to first result
        const card = searchResults.find(c => c.id == cardId) || searchResults[0]; // Use == for type coercion
        return card.img_url;
      }
    }
  } catch (error) {
    console.error('Error fetching card image:', error);
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

// Individual Deck Card Component with improved hover interactions
const DeckCard = ({
  deck,
  isSelected,
  onSelect,
  context,
  onDelete,
  onLoadInMatchUp,
  onLoadInDeckBuilder,
  canDelete,
  isLoading = false,
  hoveredDeckId,
  setHoveredDeckId
}) => {
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const isPublished = 'deck_title' in deck;
  const deckName = isPublished ? deck.deck_title : deck.name;
  const publisher = isPublished ? deck.publisher : null;
  const date = isPublished ?
    (deck.date_published ? new Date(deck.date_published).toLocaleDateString() : 'Unknown') :
    (deck.updated_at ? new Date(deck.updated_at).toLocaleDateString() : 'Unknown');

  const isHovered = hoveredDeckId === deck.id;

  useEffect(() => {
    const loadThumbnailImage = async () => {
      if (isPublished && !thumbnailImage) {
        // For published decks, try to get first card image from already parsed data first
        setImageLoading(true);
        try {
          let imageUrl = null;

          // First try: use already parsed deck data (most efficient)
          if (deck.parsedDeck && deck.parsedDeck.cards && deck.parsedDeck.cards.length > 0) {
            const firstCard = deck.parsedDeck.cards[0];
            imageUrl = firstCard.card?.img_url || null;
          }

          // Fallback: if no image from parsed data, try API call
          if (!imageUrl && deck.deck_content) {
            imageUrl = await getFirstCardImageUrl(deck.deck_content);
          }

          setThumbnailImage(imageUrl);
        } catch (error) {
          console.error('Error loading thumbnail:', error);
        } finally {
          setImageLoading(false);
        }
      } else if (!isPublished && !deck?.thumbnail && deck?.id && !thumbnailImage) {
        // For saved decks without thumbnails, try to get first card image
        setImageLoading(true);
        try {
          const imageUrl = await getFirstCardImageFromSavedDeck(deck.id);
          setThumbnailImage(imageUrl);
        } catch (error) {
          console.error('Error loading thumbnail:', error);
        } finally {
          setImageLoading(false);
        }
      }
    };

    loadThumbnailImage();
  }, [deck, isPublished, thumbnailImage]);

  const getThumbnailImage = () => {
    if (isPublished) {
      // For published decks, use first card image or fallback to placeholder
      return thumbnailImage || '/placeholder.png';
    } else {
      // For saved decks, use deck thumbnail first, then first card image, then placeholder
      return deck?.thumbnail || thumbnailImage || '/placeholder.png';
    }
  };

  const handleSelect = () => {
    if (!isLoading) {
      onSelect(deck);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(deck);
  };

  const handleMatchUpClick = (e) => {
    e.stopPropagation();
    onLoadInMatchUp();
  };

  const handleBuilderClick = (e) => {
    e.stopPropagation();
    onLoadInDeckBuilder();
  };

  const showDelete = canDelete && context !== 'matchup';
  const showNavbarButtons = context === 'navbar';

  return (
    <Card
      variant={isSelected ? "filled" : "outline"}
      colorScheme={isSelected ? "blue" : undefined}
      cursor={isLoading ? "not-allowed" : "pointer"}
      onClick={isLoading ? undefined : handleSelect}
      onMouseEnter={() => setHoveredDeckId(deck.id)}
      onMouseLeave={() => setHoveredDeckId(null)}
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
                width="140px"
                height="196px"
                objectFit="cover"
                position="absolute"
                top="-14px"
                left="-35px"
                borderRadius="lg"
              />
            ) : (
              <CardImage
                src="/placeholder.png"
                alt="Placeholder"
                width="70px"
                height="98px"
                objectFit="cover"
                borderRadius="lg"
              />
            )}

            {/* Loading overlay */}
            {(isLoading || imageLoading) && (
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

          {/* Hover Actions - Show navigation buttons when selected, delete when applicable */}
          {isHovered && (
            <HStack
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="blackAlpha.800"
              borderRadius="md"
              p={1}
              spacing={1}
              zIndex={10}
            >
              {showNavbarButtons && isSelected && (
                <>
                  <Tooltip label="To MatchUp" placement="top">
                    <IconButton
                      aria-label="To MatchUp"
                      icon={<FiPlay />}
                      size="sm"
                      colorScheme="green"
                      variant="solid"
                      onClick={handleMatchUpClick}
                    />
                  </Tooltip>

                  <Tooltip label="To Builder" placement="top">
                    <IconButton
                      aria-label="To Builder"
                      icon={<FiEdit3 />}
                      size="sm"
                      colorScheme="blue"
                      variant="solid"
                      onClick={handleBuilderClick}
                    />
                  </Tooltip>
                  {/* Show delete button for any deck that can be deleted when hovered */}
                  {showDelete && (
                    <Tooltip label="DELETE" placement="top">
                      <IconButton
                        aria-label="Delete deck"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="solid"
                        onClick={handleDelete}
                      />
                    </Tooltip>
                  )}
                </>
              )}
            </HStack>
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
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [hoveredDeckId, setHoveredDeckId] = useState(null);

  // Delete confirmation dialog
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deckToDelete, setDeckToDelete] = useState(null);
  const cancelRef = useRef();

  // Load decks when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDecks();
    }
  }, [isOpen]);

  // Filter decks based on search
  useEffect(() => {
    setFilteredMyDecks(
      myDecks.filter(deck =>
        deck.name.toLowerCase().includes(myDecksSearchTerm.toLowerCase())
      )
    );
  }, [myDecks, myDecksSearchTerm]);

  useEffect(() => {
    setFilteredPublishedDecks(
      publishedDecks.filter(deck =>
        deck.deck_title.toLowerCase().includes(publishedDecksSearchTerm.toLowerCase()) ||
        (deck.publisher && deck.publisher.toLowerCase().includes(publishedDecksSearchTerm.toLowerCase()))
      )
    );
  }, [publishedDecks, publishedDecksSearchTerm]);

  const fetchDecks = async () => {
    setLoading(true);
    try {
      // Fetch both my decks and published decks in parallel
      const [myDecksResponse, publishedDecksResponse] = await Promise.all([
        user ? fetch(`${api}/api/decks`, { credentials: 'include' }) : Promise.resolve(null),
        fetch(`${api}/api/public/decks`, { credentials: 'include' })
      ]);

      // Process my decks
      if (myDecksResponse && myDecksResponse.ok) {
        const myDecksData = await myDecksResponse.json();
        setMyDecks(Array.isArray(myDecksData) ? myDecksData : []);
      } else {
        setMyDecks([]);
      }

      // Process published decks
      if (publishedDecksResponse && publishedDecksResponse.ok) {
        const publishedDecksData = await publishedDecksResponse.json();

        // Handle both paginated and non-paginated responses
        const decks = Array.isArray(publishedDecksData)
          ? publishedDecksData
          : publishedDecksData.decks || [];

        // Parse deck content for published decks
        const parsedDecks = await Promise.all(
          decks.map(async (deck) => ({
            ...deck,
            parsedDeck: await parseDeckContent(deck.deck_content),
            type: 'published'
          }))
        );

        setPublishedDecks(parsedDecks);
      } else {
        setPublishedDecks([]);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
      toast({
        title: 'Error loading decks',
        description: 'Could not load decks. Please try again.',
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

  // Function to parse deck content string
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

  if (context !== 'navbar') {
    // For DeckBuilder and MatchUp contexts, process the deck immediately
    if (context === 'deckbuilder') {
      try {
        // For deckbuilder, we always need to fetch full deck details
        if (deck.type === 'published' || 'deck_title' in deck) {
          // Published deck - use parsed data
          const deckToReturn = {
            ...deck,
            name: deck.deck_title || deck.name,
            cards: deck.parsedDeck?.cards || []
          };
          onSelect(deckToReturn);
        } else {
          // Saved deck - fetch full details with cards
          const response = await fetch(`${api}/api/decks/${deck.id}`, {
            credentials: 'include'
          });

          if (response.ok) {
            const fullDeckData = await response.json();
            onSelect(fullDeckData);
          } else {
            throw new Error('Failed to load full deck details');
          }
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
    } else if (context === 'matchup') {
      try {
        // For MatchUp, ensure we have proper deck structure with cards
        if (deck.type === 'published' || 'deck_title' in deck) {
          // Published deck - use parsed data
          const deckToReturn = {
            ...deck,
            name: deck.deck_title || deck.name,
            cards: deck.parsedDeck?.cards || []
          };
          onSelect(deckToReturn);
        } else {
          // Saved deck - fetch full details with cards
          const response = await fetch(`${api}/api/decks/${deck.id}`, {
            credentials: 'include'
          });

          if (response.ok) {
            const fullDeckData = await response.json();
            onSelect(fullDeckData);
          } else {
            throw new Error('Failed to load full deck details');
          }
        }
      } catch (error) {
        console.error('Error loading deck for MatchUp:', error);
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
  } else {
    // FIXED: For navbar context, also call onSelect to notify parent component
    if (onSelect) {
      try {
        if (deck.type === 'published' || 'deck_title' in deck) {
          // Published deck - use parsed data
          const deckToReturn = {
            ...deck,
            name: deck.deck_title || deck.name,
            cards: deck.parsedDeck?.cards || []
          };
          onSelect(deckToReturn);
        } else {
          // Saved deck - fetch full details with cards
          const response = await fetch(`${api}/api/decks/${deck.id}`, {
            credentials: 'include'
          });

          if (response.ok) {
            const fullDeckData = await response.json();
            onSelect(fullDeckData);
          } else {
            throw new Error('Failed to load full deck details');
          }
        }
      } catch (error) {
        console.error('Error loading deck in navbar context:', error);
        toast({
          title: 'Error loading deck',
          description: 'Failed to load deck details',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
    // Note: Don't auto-close in navbar context, let user choose action with buttons
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

  const handleLoadInMatchUp = async () => {
    if (!selectedDeckId) return;

    const selectedFromMyDecks = filteredMyDecks.find(deck => deck.id === selectedDeckId);
    const selectedFromPublished = filteredPublishedDecks.find(deck => deck.id === selectedDeckId);
    const deck = selectedFromMyDecks || selectedFromPublished;

    if (deck) {
      // Navigate to MatchUp page with deck parameters
      const deckContent = deck.deck_content || await generateDeckContentForNavigation(deck);
      if (deckContent) {
        window.location.href = `/?tab=matchup&deck=${encodeURIComponent(deckContent)}`;
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
      try {
        // Use direct callback instead of URL navigation for better UX
        if (onSelect && (context === 'deckbuilder')) {
          // For DeckBuilder context, use onSelect callback (already implemented above)
          if (deck.deck_title || deck.type === 'published') {
            // Published deck - use already parsed data
            const deckToReturn = {
              ...deck,
              name: deck.deck_title || deck.name,
              cards: deck.parsedDeck?.cards || []
            };
            onSelect(deckToReturn);
          } else {
            // Saved deck - fetch full details with cards
            const response = await fetch(`${api}/api/decks/${deck.id}`, {
              credentials: 'include'
            });

            if (response.ok) {
              const fullDeckData = await response.json();
              onSelect(fullDeckData);
            } else {
              throw new Error('Failed to load full deck details');
            }
          }
        } else {
          // For navbar context, use sessionStorage to pass deck data

          if (deck.deck_title || deck.type === 'published') {
            // For published decks, store the complete deck data in sessionStorage
            const deckToStore = {
              ...deck,
              name: deck.deck_title || deck.name,
              cards: deck.parsedDeck?.cards || [],
              isPublished: true
            };

            // Store the deck data in sessionStorage
            sessionStorage.setItem('tempDeckData', JSON.stringify(deckToStore));

            // Navigate with tempDeck parameter
            window.history.replaceState(null, '', '/?tab=decks&tempDeck=published');
          } else {
            // For saved decks, use the existing loadDeck parameter approach
            window.history.replaceState(null, '', `/?tab=decks&loadDeck=${deck.id}`);
          }
        }
        onClose();
      } catch (error) {
        console.error('Error loading deck in DeckBuilder:', error);
        toast({
          title: 'Error loading deck',
          description: 'Failed to load deck in Deck Builder',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Check if user can delete a deck - Fixed logic for My Decks
  const canDeleteMyDeck = (deck) => {
    // Users can always delete their own saved decks
    // If user_id is undefined, assume it belongs to current user (since /api/decks only returns user's own decks)
    return user && (deck.user_id === user.id || deck.user_id === undefined);
  };

  const canDeletePublishedDeck = (deck) => {
    // Admin users can delete any published deck, or users can delete their own published decks
    return user && (user.role === 'admin' || user.role === 'Admin' || deck.publisher === user.username);
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
                  Select a deck and choose where to use it
                </Text>
              )}
            </VStack>
          </ModalHeader>

          <ModalCloseButton />

          <ModalBody px={6} py={0}>
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="xl" color="blue.500" />
                <Text mt={4} color="gray.600">Loading decks...</Text>
              </Box>
            ) : (
              <Tabs variant="enclosed" colorScheme="blue">
                <TabList>
                  <Tab>
                    <HStack spacing={2}>
                      <Icon as={FiFolder} />
                      <Text>My Decks</Text>
                      <Badge colorScheme="blue" variant="subtle">
                        {filteredMyDecks.length}
                      </Badge>
                    </HStack>
                  </Tab>
                  <Tab>
                    <HStack spacing={2}>
                      <Icon as={FiDatabase} />
                      <Text>Published Decks</Text>
                      <Badge colorScheme="green" variant="subtle">
                        {filteredPublishedDecks.length}
                      </Badge>
                    </HStack>
                  </Tab>
                </TabList>

                <TabPanels>
                  {/* My Decks Tab */}
                  <TabPanel px={0} py={4}>
                    <VStack spacing={4} align="stretch">
                      {/* Search Bar */}
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <SearchIcon color="gray.300" />
                        </InputLeftElement>
                        <Input
                          placeholder="Search your decks..."
                          value={myDecksSearchTerm}
                          onChange={(e) => setMyDecksSearchTerm(e.target.value)}
                        />
                      </InputGroup>

                      {/* My Decks Grid */}
                      {filteredMyDecks.length > 0 ? (
                        <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 6 }} spacing={4}>
                          {filteredMyDecks.map((deck) => (
                            <DeckCard
                              key={deck.id}
                              deck={deck}
                              isSelected={selectedDeckId === deck.id}
                              onSelect={handleDeckSelect}
                              context={context}
                              onDelete={handleDeleteDeck}
                              onLoadInMatchUp={handleLoadInMatchUp}
                              onLoadInDeckBuilder={handleLoadInDeckBuilder}
                              canDelete={canDeleteMyDeck(deck)}
                              hoveredDeckId={hoveredDeckId}
                              setHoveredDeckId={setHoveredDeckId}
                            />
                          ))}
                        </SimpleGrid>
                      ) : user ? (
                        <Box textAlign="center" py={8}>
                          <Icon as={FiFolder} fontSize="3xl" color="gray.300" />
                          <Text mt={2} color="gray.500">
                            {myDecksSearchTerm ? 'No matching decks found' : 'No saved decks yet'}
                          </Text>
                          {!myDecksSearchTerm && (
                            <Text fontSize="sm" color="gray.400">
                              Save decks in the Deck Builder to see them here
                            </Text>
                          )}
                        </Box>
                      ) : (
                        <Box textAlign="center" py={8}>
                          <Icon as={FiUser} fontSize="3xl" color="gray.300" />
                          <Text mt={2} color="gray.500">Please sign in to view your decks</Text>
                        </Box>
                      )}
                    </VStack>
                  </TabPanel>

                  {/* Published Decks Tab */}
                  <TabPanel px={0} py={4}>
                    <VStack spacing={4} align="stretch">
                      {/* Search Bar */}
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <SearchIcon color="gray.300" />
                        </InputLeftElement>
                        <Input
                          placeholder="Search published decks..."
                          value={publishedDecksSearchTerm}
                          onChange={(e) => setPublishedDecksSearchTerm(e.target.value)}
                        />
                      </InputGroup>

                      {/* Published Decks Grid */}
                      {filteredPublishedDecks.length > 0 ? (
                        <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 6 }} spacing={4}>
                          {filteredPublishedDecks.map((deck) => (
                            <DeckCard
                              key={deck.id}
                              deck={deck}
                              isSelected={selectedDeckId === deck.id}
                              onSelect={handleDeckSelect}
                              context={context}
                              onDelete={handleDeleteDeck}
                              onLoadInMatchUp={handleLoadInMatchUp}
                              onLoadInDeckBuilder={handleLoadInDeckBuilder}
                              canDelete={canDeletePublishedDeck(deck)}
                              hoveredDeckId={hoveredDeckId}
                              setHoveredDeckId={setHoveredDeckId}
                            />
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Box textAlign="center" py={8}>
                          <Icon as={FiDatabase} fontSize="3xl" color="gray.300" />
                          <Text mt={2} color="gray.500">
                            {publishedDecksSearchTerm ? 'No matching published decks found' : 'No published decks available'}
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
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
