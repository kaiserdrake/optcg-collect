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
  CardBody
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiTrash2, FiUser, FiCalendar, FiDatabase, FiFolder, FiLayers } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

const DeckCard = ({ deck, onDelete, canDelete, isPublished = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstCardThumbnailUrl, setFirstCardThumbnailUrl] = useState(null);
  const toast = useToast();

  // Load first card thumbnail for published decks (they don't have deck thumbnails)
  useEffect(() => {
    if (isPublished && deck?.deck_content) {
      getFirstCardImageUrl(deck.deck_content).then(url => {
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
      // For saved decks, use deck thumbnail from database or placeholder
      return deck?.thumbnail || '/placeholder.png';
    } else {
      // For published decks, use first card thumbnail (no deck thumbnail stored)
      return firstCardThumbnailUrl || '/placeholder.png';
    }
  };

  const handleDelete = async () => {
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
      variant="outline"
      cursor="pointer"
      _hover={{
        shadow: "md",
        borderColor: "blue.300",
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
            <CardImage
              src={getThumbnailImage()}
              alt={isPublished ? 'First card thumbnail' : 'Deck thumbnail'}
              width="70px"
              height="98px"
              borderRadius="lg"
              fallbackSrc="/placeholder.png"
            />

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
                {isPublished ? 'Published' : 'My Deck'}
              </Badge>
            )}
          </Box>

          {/* Date */}
          <Text fontSize="xs" color="gray.500">
            {isPublished ? `Published: ${date}` : `Updated: ${date}`}
          </Text>

          {/* Delete Button */}
          {canDelete && (
            <Box position="absolute" top="2" right="2">
              <IconButton
                icon={<Icon as={FiTrash2} />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                aria-label="Delete deck"
                bg="white"
                shadow="sm"
                _hover={{ bg: 'red.50', shadow: 'md' }}
                borderRadius="full"
              />
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

const DeckManagementModal = ({ isOpen, onClose }) => {
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

  // Modal control for delete confirmation
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Load decks when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAllDecks();
      setMyDecksSearchTerm('');
      setPublishedDecksSearchTerm('');
    }
  }, [isOpen, user]);

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
      setIsDeletingDeck(false)
      onDeleteClose();
      setDeckToDelete(null);
    }
  };

  // Check if user can delete a deck
  const canDeleteMyDeck = () => true; // User can always delete their own decks

  const canDeletePublishedDeck = (deck) => {
    if (!user) return false;
    // User can delete if they are the publisher or if they are admin
    return deck.publisher === user.alias || user.role === 'Admin';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent maxH="90vh">
          <ModalHeader>
            <HStack spacing={2}>
              <Icon as={FiLayers} color="blue.500" />
              <Text>Deck Management</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody overflow="auto">
            <Tabs index={activeTab} onChange={setActiveTab}>

              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiFolder} />
                    <Text>My Decks</Text>
                    <Badge colorScheme="blue" size="sm">
                      {myDecks.length}
                    </Badge>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiDatabase} />
                    <Text>Published Decks</Text>
                    <Badge colorScheme="green" size="sm">
                      {publishedDecks.length}
                    </Badge>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* My Decks Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Search bar for My Decks */}
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search my decks..."
                        value={myDecksSearchTerm}

                        onChange={(e) => setMyDecksSearchTerm(e.target.value)}
                      />
                    </InputGroup>

                    {/* My Decks List */}
                    <Box>
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
                              : 'Start building and saving decks to see them here'
                            }
                          </Text>
                        </Flex>
                      ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing={4}>
                          {filteredMyDecks.map((deck) => (
                            <DeckCard
                              key={deck.id}
                              deck={deck}
                              onDelete={handleDeleteDeck}
                              canDelete={canDeleteMyDeck()}
                              isPublished={false}
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
                    {/* Search bar for Published Decks */}
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search published decks by name or publisher..."
                        value={publishedDecksSearchTerm}
                        onChange={(e) => setPublishedDecksSearchTerm(e.target.value)}
                      />
                    </InputGroup>

                    {/* Published Decks List */}
                    <Box>
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
                              onDelete={handleDeleteDeck}
                              canDelete={canDeletePublishedDeck(deck)}
                              isPublished={true}
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

export default DeckManagementModal;
