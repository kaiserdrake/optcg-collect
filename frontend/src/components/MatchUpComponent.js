'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Grid,
  GridItem,
  Heading,
  useDisclosure,
  useToast,
  Spinner,
  Divider,
  Badge,
  IconButton,
  useBreakpointValue,
  Flex,
  useColorModeValue,
  Collapse
} from '@chakra-ui/react';

import { AddIcon, RepeatIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useSearchParams } from 'next/navigation';
import UnifiedDeckModal from './UnifiedDeckModal';
import DeckViewerCanvas from '@/components/DeckViewerCanvas';

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

// Utility function to generate deck content string from deck cards
const generateDeckContent = (deck) => {
  if (!deck?.cards || !Array.isArray(deck.cards) || deck.cards.length === 0) {
    return '';

  }

  return deck.cards
    .map(item => {
      const cardCode = item.card?.card_code || item.card_code;
      const count = item.count || 1;
      return `${count}x${cardCode}`;
    })
    .join(',');
};

const MatchUpComponent = () => {
  const searchParams = useSearchParams();
  const toast = useToast();


  const [deck1, setDeck1] = useState({ name: '', cards: [], type: null });
  const [deck2, setDeck2] = useState({ name: '', cards: [], type: null });
  const [loadingDeck1, setLoadingDeck1] = useState(false);
  const [loadingDeck2, setLoadingDeck2] = useState(false);
  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState(1);

  // Battle toolbox state
  const [goingFirst, setGoingFirst] = useState(true);
  const [diceResult, setDiceResult] = useState(null);
  const [leaderUsed, setLeaderUsed] = useState(false);
  const [powerCounters, setPowerCounters] = useState([0, 0, 0, 0, 0, 0]); // 6 counters, each -10 to +10

  // Collapsible hook for toolbox
  const { isOpen: isToolboxOpen, onToggle: onToolboxToggle } = useDisclosure();

  const updatePowerCounter = (index, change) => {
    setPowerCounters(prev => {
      const newCounters = [...prev];
      const newValue = newCounters[index] + change;
      newCounters[index] = Math.max(-10, Math.min(10, newValue)); // Clamp between -10 and +10
      return newCounters;
    });
  };

  const resetPowerCounter = (index) => {
    setPowerCounters(prev => {
      const newCounters = [...prev];
      newCounters[index] = 0;
      return newCounters;
    });
  };

  const { isOpen: isSelectOpen, onOpen: onSelectOpen, onClose: onSelectClose } = useDisclosure();

  // Responsive grid settings
  const gridTemplate = useBreakpointValue({
    base: '1fr',
    lg: 'repeat(2, 1fr)'
  });
  const gridGap = useBreakpointValue({
    base: 4,
    lg: 6
  });

  // Check if we should use mobile layout (wrap player info to multiple lines)
  const isMobile = useBreakpointValue({ base: true, sm: false });

  // Load decks from URL parameters on mount
  useEffect(() => {
    const deckParams = searchParams.getAll('deck');

    if (deckParams.length > 0) {
      // Load first deck
      if (deckParams[0]) {
        loadDeckFromContent(deckParams[0], 1);
      }

      // Load second deck if provided
      if (deckParams[1]) {
        loadDeckFromContent(deckParams[1], 2);
      }
    }
  }, [searchParams]);

  const loadDeckFromContent = async (deckContent, playerNumber) => {
    if (!deckContent) return;

    const setLoading = playerNumber === 1 ? setLoadingDeck1 : setLoadingDeck2;
    const setDeck = playerNumber === 1 ? setDeck1 : setDeck2;

    setLoading(true);

    try {
      const parsedDeck = await parseDeckContent(deckContent);

      const deck = {
        name: `Player ${playerNumber} Deck`,
        cards: parsedDeck.cards || [],
        type: 'url_param',
        deck_content: deckContent
      };

      setDeck(deck);

      toast({
        title: 'Deck Loaded',
        description: `Player ${playerNumber} deck loaded from URL`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error loading deck from URL:', error);
      toast({
        title: 'Error Loading Deck',
        description: `Failed to load Player ${playerNumber} deck from URL`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDeck = (playerNumber) => {
    setSelectedPlayerNumber(playerNumber);
    onSelectOpen();
  };

  const handleDeckSelected = (selectedDeck) => {
    // Normalize the selected deck
    const safeDeck = {
      name: selectedDeck?.name || selectedDeck?.deck_title || 'Selected Deck',
      cards: Array.isArray(selectedDeck?.cards) ? selectedDeck.cards : [],
      type: selectedDeck?.type || 'unknown',
      thumbnail: selectedDeck?.thumbnail || null,
      publisher: selectedDeck?.publisher || null,
      deck_content: selectedDeck?.deck_content || generateDeckContent(selectedDeck),
      ...selectedDeck
    };

    if (selectedPlayerNumber === 1) {
      setDeck1(safeDeck);
    } else {
      setDeck2(safeDeck);
    }

    toast({
      title: 'Deck Selected',
      description: `"${safeDeck.name}" selected for Player ${selectedPlayerNumber} (${safeDeck.cards.length} cards)`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    onSelectClose();
  };

  const clearDeck = (playerNumber) => {
    const emptyDeck = { name: '', cards: [], type: null };

    if (playerNumber === 1) {
      setDeck1(emptyDeck);
    } else {
      setDeck2(emptyDeck);
    }

    toast({
      title: `Player ${playerNumber} deck cleared`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const generateShareableURL = async () => {
    // Generate deck content strings from current decks
    const deck1Content = deck1?.deck_content || generateDeckContent(deck1);
    const deck2Content = deck2?.deck_content || generateDeckContent(deck2);

    if (!deck1Content && !deck2Content) {
      toast({
        title: 'No decks to share',
        description: 'Select at least one deck to generate a shareable URL',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Show loading state
    toast({
      title: 'Generating short URL...',
      status: 'info',
      duration: 2000,
      isClosable: true,

    });

    try {
      // Create the original long URL
      const params = new URLSearchParams();
      params.set('tab', 'matchup');

      if (deck1Content) {
        params.append('deck', deck1Content);
      }
      if (deck2Content) {
        params.append('deck', deck2Content);
      }

      const originalUrl = `${window.location.origin}/?${params.toString()}`;

      // Call the short URL API
      const response = await fetch(`${api}/api/short-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to create short URL');
      }

      const data = await response.json();
      const shortUrl = data.shortUrl;

      // Copy to clipboard
      navigator.clipboard.writeText(shortUrl).then(() => {
        toast({
          title: 'Short URL Copied!',
          description: 'The short URL has been copied to your clipboard',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }).catch(() => {
        // Fallback: Show the URL in a toast for manual copying
        toast({
          title: 'Short URL Generated',
          description: shortUrl,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
      });
    } catch (error) {
      console.error('Error generating short URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate short URL',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Component to render player header section with responsive layout
  const PlayerHeader = ({
    playerNumber,
    deck,
    loading,
    colorScheme,
    onSelectDeck,
    onClearDeck
  }) => {
    if (isMobile) {
      // Mobile layout: Stack elements vertically
      return (
        <VStack spacing={2} align="stretch">
          {/* First row: Player badge */}
          <HStack spacing={2}>
            <Badge colorScheme={colorScheme} variant="solid" fontSize="sm">
              Player {playerNumber}
            </Badge>
          </HStack>

          {/* Second row: Deck name */}
          <Box>

            <Text fontWeight="semibold" color="gray.700" isTruncated>
              {deck?.name || 'No Deck Selected'}
            </Text>
          </Box>

          {/* Third row: Action buttons */}
          <HStack spacing={2}>
            {(deck?.cards?.length || 0) > 0 && (
              <IconButton
                icon={<RepeatIcon />}
                size="sm"
                variant="outline"
                onClick={() => onClearDeck(playerNumber)}
                aria-label="Clear deck"
              />
            )}
            <Button
              leftIcon={<AddIcon />}
              size="sm"
              colorScheme={colorScheme}
              variant="outline"
              onClick={() => onSelectDeck(playerNumber)}
              isLoading={loading}

              flex="1"
            >
              Select Deck
            </Button>
          </HStack>
        </VStack>
      );
    } else {
      // Desktop layout: Keep original horizontal layout
      return (
        <HStack justify="space-between" align="center">

          <HStack spacing={2}>
            <Badge colorScheme={colorScheme} variant="solid" fontSize="sm">
              Player {playerNumber}
            </Badge>
            <Text fontWeight="semibold" color="gray.700" isTruncated>
              {deck?.name || 'No Deck Selected'}
            </Text>
          </HStack>
          <HStack spacing={2} flexShrink={0}>
            {(deck?.cards?.length || 0) > 0 && (
              <IconButton
                icon={<RepeatIcon />}
                size="sm"
                variant="outline"
                onClick={() => onClearDeck(playerNumber)}
                aria-label="Clear deck"
              />
            )}
            <Button
              leftIcon={<AddIcon />}
              size="sm"
              colorScheme={colorScheme}
              variant="outline"
              onClick={() => onSelectDeck(playerNumber)}
              isLoading={loading}
            >
              Select Deck
            </Button>
          </HStack>
        </HStack>
      );
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Battle Toolbox - Collapsible */}
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="lg"
        overflow="hidden"
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
          onClick={onToolboxToggle}
        >
          <Text fontSize="md" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
            Battle Tools
          </Text>
          <HStack spacing={2}>
            <Button
              leftIcon={<ExternalLinkIcon />}
              size="xs"
              variant="outline"
              colorScheme="green"
              onClick={(e) => {
                e.stopPropagation();
                generateShareableURL();
              }}
              isDisabled={(deck1?.cards?.length || 0) === 0 && (deck2?.cards?.length || 0) === 0}
            >
              Share
            </Button>
            <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
              {isToolboxOpen ? '▼' : '▶'}
            </Text>
          </HStack>
        </Button>


        {/* Collapsible Content */}
        <Collapse in={isToolboxOpen}>
          <Box p={3} borderTop="1px solid" borderColor={useColorModeValue('gray.200', 'gray.600')}>
            <VStack spacing={3}>
              {/* Battle Controls Grid */}
              <Grid templateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap={2} w="100%">
                {/* Turn Order Toggle */}
                <Box
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  p={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                >
                  <VStack spacing={1}>
                    <Text fontSize="xs" fontWeight="semibold" color={useColorModeValue('gray.600', 'gray.400')}>
                      Turn Order
                    </Text>
                    <Button
                      size="xs"
                      variant={goingFirst ? "solid" : "outline"}
                      colorScheme={goingFirst ? "blue" : "gray"}
                      onClick={() => setGoingFirst(!goingFirst)}
                      w="100%"

                    >
                      {goingFirst ? "First" : "Second"}
                    </Button>
                  </VStack>
                </Box>

                {/* D20 Dice Roller */}
                <Box
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  p={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                >
                  <VStack spacing={1}>
                    <Text fontSize="xs" fontWeight="semibold" color={useColorModeValue('gray.600', 'gray.400')}>
                      D20 Roll
                    </Text>
                    <Button
                      size="xs"
                      colorScheme="purple"
                      onClick={() => setDiceResult(Math.floor(Math.random() * 20) + 1)}
                      w="100%"
                    >

                      {diceResult ? `${diceResult}` : "Roll"}
                    </Button>

                  </VStack>
                </Box>

                {/* Leader Ability Toggle */}

                <Box
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  p={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                >
                  <VStack spacing={1}>
                    <Text fontSize="xs" fontWeight="semibold" color={useColorModeValue('gray.600', 'gray.400')}>
                      Leader Ability
                    </Text>
                    <Button
                      size="xs"
                      variant={leaderUsed ? "solid" : "outline"}
                      colorScheme={leaderUsed ? "red" : "green"}

                      onClick={() => setLeaderUsed(!leaderUsed)}
                      w="100%"
                    >
                      {leaderUsed ? "Used" : "Ready"}
                    </Button>
                  </VStack>
                </Box>
              </Grid>

              {/* Power Counters */}
              <Box w="100%">
                <Text fontSize="sm" fontWeight="semibold" mb={2} color={useColorModeValue('gray.600', 'gray.400')}>
                  Power Counters (-10K to +10K)
                </Text>
                <Grid templateColumns="repeat(auto-fit, minmax(100px, 1fr))" gap={2}>
                  {powerCounters.map((counter, index) => {
                    return (
                      <Box
                        key={index}
                        bg={useColorModeValue('gray.50', 'gray.700')}
                        p={2}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={useColorModeValue('gray.200', 'gray.600')}
                      >
                        <VStack spacing={1}>
                          <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                            Counter {index + 1}
                          </Text>
                          <HStack spacing={1}>
                            <Button
                              size="2xs"
                              onClick={() => updatePowerCounter(index, -1)}
                              isDisabled={counter <= -10}
                              colorScheme="red"
                              variant="outline"
                              minW={0}
                              px={1}
                            >
                              -
                            </Button>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              minW="35px"
                              textAlign="center"
                              color={counter === 0 ? "gray.500" : counter > 0 ? "green.500" : "red.500"}
                            >
                              {counter === 0 ? "0" : counter > 0 ? `+${counter}K` : `${counter}K`}
                            </Text>
                            <Button
                              size="2xs"
                              onClick={() => updatePowerCounter(index, 1)}
                              isDisabled={counter >= 10}
                              colorScheme="green"
                              variant="outline"
                              minW={0}
                              px={1}
                            >
                              +
                            </Button>
                          </HStack>
                          <Button
                            size="2xs"
                            variant="ghost"
                            onClick={() => resetPowerCounter(index)}
                            fontSize="2xs"
                            minH="auto"
                            h="auto"
                            py={0}
                          >
                            Reset
                          </Button>
                        </VStack>
                      </Box>
                    );
                  })}
                </Grid>
              </Box>
            </VStack>
          </Box>
        </Collapse>
      </Box>

      {/* Deck Comparison Grid */}
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        gap={gridGap}
        minH="500px"
        w="100%"
      >
        {/* Player 1 Deck */}
        <GridItem w="100%" minW={0}>
          <VStack spacing={4} align="stretch" h="100%">
            {isMobile ? (
              <VStack spacing={2} align="stretch">
                {/* Mobile: Player badge */}
                <HStack spacing={2}>
                  <Badge colorScheme="blue" variant="solid" fontSize="sm">
                    Player 1
                  </Badge>
                </HStack>

                {/* Mobile: Deck name */}
                <Box>
                  <Text fontWeight="semibold" color="gray.700" isTruncated>
                    {deck1?.name || 'No Deck Selected'}
                  </Text>
                </Box>

                {/* Mobile: Action buttons */}
                <HStack spacing={2}>
                  {(deck1?.cards?.length || 0) > 0 && (
                    <IconButton
                      icon={<RepeatIcon />}
                      size="sm"
                      variant="outline"
                      onClick={() => clearDeck(1)}
                      aria-label="Clear deck"
                    />
                  )}
                  <Button
                    leftIcon={<AddIcon />}
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => handleSelectDeck(1)}
                    isLoading={loadingDeck1}
                    flex="1"
                  >
                    Select Deck
                  </Button>
                </HStack>
              </VStack>
            ) : (
                <HStack justify="space-between" align="center">
                  <HStack spacing={2} flex="1" minW={0}>
                    <Badge colorScheme="blue" variant="solid" fontSize="sm">
                      Player 1
                    </Badge>
                    <Text fontWeight="semibold" color="gray.700" isTruncated>
                      {deck1?.name || 'No Deck Selected'}
                    </Text>
                  </HStack>
                  <HStack spacing={2} flexShrink={0}>
                    {(deck1?.cards?.length || 0) > 0 && (
                      <IconButton
                        icon={<RepeatIcon />}
                        size="sm"
                        variant="outline"
                        onClick={() => clearDeck(1)}
                        aria-label="Clear deck"
                      />
                    )}
                    <Button
                      leftIcon={<AddIcon />}
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleSelectDeck(1)}
                      isLoading={loadingDeck1}
                    >
                      Select Deck
                    </Button>
                  </HStack>
                </HStack>
              )}

            {loadingDeck1 ? (
              <Box textAlign="center" py={8}>
                <Spinner size="xl" color="blue.500" />
                <Text mt={4} color="gray.600">Loading deck...</Text>
              </Box>
            ) : (
                <Box w="100%" minW={0}>
                  <DeckViewerCanvas
                    deck={deck1}
                    showStats={true}
                    playerNumber={1}
                  />
                </Box>
              )}
          </VStack>
        </GridItem>

        {/* Player 2 Deck */}
        <GridItem w="100%" minW={0}>
          <VStack spacing={4} align="stretch" h="100%">
            {isMobile ? (
              <VStack spacing={2} align="stretch">
                {/* Mobile: Player badge */}
                <HStack spacing={2}>
                  <Badge colorScheme="red" variant="solid" fontSize="sm">
                    Player 2
                  </Badge>
                </HStack>

                {/* Mobile: Deck name */}
                <Box>
                  <Text fontWeight="semibold" color="gray.700" isTruncated>
                    {deck2?.name || 'No Deck Selected'}
                  </Text>
                </Box>

                {/* Mobile: Action buttons */}
                <HStack spacing={2}>
                  {(deck2?.cards?.length || 0) > 0 && (
                    <IconButton
                      icon={<RepeatIcon />}
                      size="sm"
                      variant="outline"
                      onClick={() => clearDeck(2)}
                      aria-label="Clear deck"
                    />
                  )}
                  <Button
                    leftIcon={<AddIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleSelectDeck(2)}
                    isLoading={loadingDeck2}
                    flex="1"
                  >
                    Select Deck
                  </Button>
                </HStack>
              </VStack>
            ) : (
                <HStack justify="space-between" align="center">
                  <HStack spacing={2} flex="1" minW={0}>
                    <Badge colorScheme="red" variant="solid" fontSize="sm">
                      Player 2
                    </Badge>
                    <Text fontWeight="semibold" color="gray.700" isTruncated>
                      {deck2?.name || 'No Deck Selected'}
                    </Text>
                  </HStack>
                  <HStack spacing={2} flexShrink={0}>
                    {(deck2?.cards?.length || 0) > 0 && (
                      <IconButton
                        icon={<RepeatIcon />}
                        size="sm"
                        variant="outline"
                        onClick={() => clearDeck(2)}
                        aria-label="Clear deck"
                      />
                    )}
                    <Button
                      leftIcon={<AddIcon />}
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleSelectDeck(2)}
                      isLoading={loadingDeck2}
                    >
                      Select Deck
                    </Button>
                  </HStack>
                </HStack>
              )}

            {loadingDeck2 ? (
              <Box textAlign="center" py={8}>
                <Spinner size="xl" color="red.500" />
                <Text mt={4} color="gray.600">Loading deck...</Text>
              </Box>
            ) : (
                <Box w="100%" minW={0}>
                  <DeckViewerCanvas
                    deck={deck2}
                    showStats={true}
                    playerNumber={2}
                  />
                </Box>
              )}
          </VStack>
        </GridItem>
      </Grid>
      {/* Select Deck using UnifiedDeckModal */}
      <UnifiedDeckModal
        isOpen={isSelectOpen}
        onClose={onSelectClose}
        onSelect={(selectedDeck) => {
          // Use the existing handleDeckSelected logic
          handleDeckSelected(selectedDeck);
        }}
        context="matchup"
        title={`Select Deck for Player ${selectedPlayerNumber}`}
      />

    </VStack>
  );
};

export default MatchUpComponent;
