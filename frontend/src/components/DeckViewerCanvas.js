'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  Tag,
  TagLabel,
  IconButton,
  Tooltip,
  Badge,
  useDisclosure,
  Flex,
  Select,
  Wrap,
  WrapItem,
  Image,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Circle,
  useBreakpointValue
} from '@chakra-ui/react';

import { BsSortUp, BsSortDown } from 'react-icons/bs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import DeckCard from './DeckCard';
import CardDetailModal from './CardDetailModal';
import StyledTextRenderer from './StyledTextRenderer';
import { colorMap } from '@/utils/cardStyles';

// Helper function to get card data (consistent with existing codebase)
const getCardData = (item) => {
  if (!item) return null;

  // Handle different card data structures
  if (item.card) {
    return item.card;
  }

  return item;
};

// Extract keywords from effect and trigger_effect text
const extractStyledKeywords = (effect, triggerEffect) => {
  const keywordStyles = {
    'trigger': { bg: 'yellow.400', color: 'black', variant: 'solid' },
    'on play': { colorScheme: 'blue', variant: 'solid' },
    'rush': { colorScheme: 'orange', variant: 'solid' },
    'blocker': { colorScheme: 'orange', variant: 'solid' },
    'double attack': { colorScheme: 'orange', variant: 'solid' },
    'banish': { colorScheme: 'orange', variant: 'solid' },
    'counter': { colorScheme: 'red', variant: 'solid' },
    'once per turn': { colorScheme: 'pink', variant: 'solid' },
    'activate: main': { colorScheme: 'blue', variant: 'solid' },
    'your turn': { colorScheme: 'blue', variant: 'solid' },
    'end of your turn': { colorScheme: 'blue', variant: 'solid' },
    'main': { colorScheme: 'blue', variant: 'solid' },
    'when attacking': { colorScheme: 'blue', variant: 'solid' },
    'when blocking': { colorScheme: 'blue', variant: 'solid' },
    'on k.o.': { colorScheme: 'blue', variant: 'solid' }
  };

  const combinedText = `${effect || ''} ${triggerEffect || ''}`;
  const regex = /\[([^\]]+)\]/g;
  const keywordCounts = {};
  let match;

  while ((match = regex.exec(combinedText)) !== null) {
    const keyword = match[1];
    const keywordLower = keyword.toLowerCase();

    if (keywordStyles[keywordLower]) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    }
  }

  return keywordCounts;
};

const DeckViewerCanvas = ({ deck, showStats = true, playerNumber = 1 }) => {
  const [sortMode, setSortMode] = useState('cost');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(100); // Change default to 100
  const { isOpen: isCardDetailOpen, onOpen: onCardDetailOpen, onClose: onCardDetailClose } = useDisclosure();
  const [selectedCardForDetail, setSelectedCardForDetail] = useState(null);

  // Check if we should use mobile layout for controls
  const isMobile = useBreakpointValue({ base: true, md: false });

  const colorScheme = playerNumber === 1 ? 'blue' : 'red';

  // Calculate deck statistics
  const stats = useMemo(() => {
    if (!deck?.cards || deck.cards.length === 0) {
      return {
        totalCards: 0,
        uniqueCards: 0,
        hasLeader: false,
        leader: null,
        costDistribution: {},
        colorDistribution: {},
        categoryDistribution: {},
        averageCounterValue: 0,
        keywordCounts: {},
        counter1K: 0,
        counter2K: 0
      };
    }

    let totalCards = 0;
    let leader = null;
    let costDist = {};
    let colorDist = {};
    let categoryDist = {};
    let keywordCounts = {};
    let totalCounterValue = 0;
    let cardsWithCounters = 0;
    let counter1K = 0;
    let counter2K = 0;

    deck.cards.forEach(item => {
      const cardData = getCardData(item);
      const count = item.count || 1;
      totalCards += count;

      if (cardData?.category === 'LEADER') {
        leader = cardData;
      }

      // Cost distribution
      const cost = cardData?.cost || 0;
      costDist[cost] = (costDist[cost] || 0) + count;

      // Color distribution
      if (cardData?.color) {
        colorDist[cardData.color] = (colorDist[cardData.color] || 0) + count;
      }

      // Category distribution
      if (cardData?.category) {
        categoryDist[cardData.category] = (categoryDist[cardData.category] || 0) + count;
      }

      // Counter values
      if (cardData?.counter) {
        totalCounterValue += cardData.counter * count;
        cardsWithCounters += count;

        if (cardData.counter === 1000) counter1K += count;
        if (cardData.counter === 2000) counter2K += count;
      }

      // Extract keywords from effect text
      if (cardData?.effect || cardData?.trigger_effect) {
        const cardKeywords = extractStyledKeywords(cardData.effect, cardData.trigger_effect);
        Object.entries(cardKeywords).forEach(([keyword, keywordCount]) => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + (keywordCount * count);
        });
      }
    });

    const averageCounterValue = cardsWithCounters > 0 ?
      (totalCounterValue / cardsWithCounters).toFixed(1) : 0;

    return {
      totalCards,
      uniqueCards: deck.cards.length,
      hasLeader: !!leader,
      leader,
      costDistribution: costDist,
      colorDistribution: colorDist,
      categoryDistribution: categoryDist,
      averageCounterValue: parseFloat(averageCounterValue),
      keywordCounts,
      counter1K,
      counter2K
    };
  }, [deck?.cards]);

  // Sort deck cards - Leader always first
  const sortedCards = useMemo(() => {
    if (!deck?.cards || deck.cards.length === 0) {
      return [];
    }

    const leaderCards = [];
    const nonLeaderCards = [];

    // Separate leader and non-leader cards
    deck.cards.forEach(item => {
      const cardData = getCardData(item);
      if (cardData?.category === 'LEADER') {
        leaderCards.push(item);
      } else {
        nonLeaderCards.push(item);
      }
    });

    // Sort non-leader cards
    nonLeaderCards.sort((a, b) => {
      const cardA = getCardData(a);
      const cardB = getCardData(b);

      if (!cardA || !cardB) return 0;

      let comparison = 0;

      switch (sortMode) {
        case 'cost':
          comparison = (cardA.cost || 0) - (cardB.cost || 0);
          break;
        case 'name':
          comparison = (cardA.name || '').localeCompare(cardB.name || '');
          break;
        case 'category':
          comparison = (cardA.category || '').localeCompare(cardB.category || '');
          break;
        case 'color':
          comparison = (cardA.color || '').localeCompare(cardB.color || '');
          break;
        case 'count':
          comparison = (a.count || 0) - (b.count || 0);
          break;
        default:
          comparison = (cardA.cost || 0) - (cardB.cost || 0);
      }

      return sortReverse ? -comparison : comparison;
    });

    // Always put leader cards first
    return [...leaderCards, ...nonLeaderCards];
  }, [deck?.cards, sortMode, sortReverse]);

  const handleCardClick = (item) => {
    const cardData = getCardData(item);
    if (cardData) {
      setSelectedCardForDetail(cardData);
      onCardDetailOpen();
    }
  };

  const getColorName = (colorCode) => {
    const colorMap = {
      'R': 'Red',
      'G': 'Green',
      'B': 'Blue',
      'P': 'Purple',
      'Y': 'Yellow',
      'BK': 'Black'
    };
    return colorMap[colorCode] || colorCode;
  };

  const getColorHex = (colorCode) => {
    // Handle both short codes (R, G, B) and full names (Red, Green, Blue)
    const colorCodeToName = {
      'R': 'Red',
      'G': 'Green',
      'B': 'Blue',
      'P': 'Purple',
      'Y': 'Yellow',
      'BK': 'Black'
    };

    // Check if it's already a full color name
    if (colorMap[colorCode]) {
      return colorMap[colorCode];
    }

    // Otherwise, convert code to name
    const colorName = colorCodeToName[colorCode];
    const hexColor = colorMap[colorName] || '#718096';
    return hexColor;
  };

  if (!deck || !deck.cards || !Array.isArray(deck.cards)) {
    return (
      <Box
        bg="gray.50"
        borderRadius="md"
        p={6}
        border="2px solid"
        borderColor="gray.200"
        minH="400px"
        textAlign="center"
      >
        <VStack spacing={4} justify="center" h="100%">
          <Text color="gray.500" fontSize="lg" fontWeight="medium">
            No deck selected
          </Text>
          <Text color="gray.400" fontSize="sm">
            Select a deck to view its contents
          </Text>
        </VStack>
      </Box>
    );
  }

  if (deck.cards.length === 0) {
    return (
      <Box
        bg="gray.50"
        borderRadius="md"
        p={6}
        border="2px solid"
        borderColor="gray.200"
        minH="400px"
        textAlign="center"
      >
        <VStack spacing={4} justify="center" h="100%">
          <Text color="gray.500" fontSize="lg" fontWeight="medium">
            Empty deck
          </Text>
          <Text color="gray.400" fontSize="sm">
            This deck has no cards
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="100%">
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="bold" color={`${colorScheme}.600`}>
            {deck.name || `Player ${playerNumber} Deck`}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {stats.totalCards} cards • {stats.hasLeader ? 'Has leader' : 'No leader'}
          </Text>
        </VStack>
        <Badge
          colorScheme={colorScheme}
          variant="subtle"
          fontSize="sm"
          px={3}
          py={1}
          borderRadius="full"
        >
          Player {playerNumber}
        </Badge>
      </HStack>
      <Tabs variant="enclosed" colorScheme={colorScheme} flex="1">
        <TabList>
          <Tab>Cards</Tab>
          <Tab>Stats</Tab>
          <Tab>Keywords</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* Compact Controls - Responsive Layout */}
            {isMobile ? (
              // Mobile layout: Two rows
              <VStack spacing={3} align="stretch" mb={4}>
                {/* First row: Thumbnail Size Slider */}
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.600" minW="60px">Size:</Text>
                  <Slider
                    value={thumbnailSize}
                    onChange={setThumbnailSize}
                    min={80}
                    max={200}
                    step={10}
                    flex="1"
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={4} />
                  </Slider>
                  <Text fontSize="sm" color="gray.500" minW="35px">{thumbnailSize}</Text>
                </HStack>

                {/* Second row: Sort Controls */}
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.600" minW="60px">Sort:</Text>
                  <Select
                    size="sm"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    flex="1"
                  >
                    <option value="cost">Cost</option>
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                    <option value="color">Color</option>
                    <option value="count">Count</option>
                  </Select>

                  <Tooltip label={sortReverse ? 'Sort ascending' : 'Sort descending'}>
                    <IconButton
                      icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                      size="sm"
                      variant="outline"
                      onClick={() => setSortReverse(!sortReverse)}
                      flexShrink={0}
                    />
                  </Tooltip>
                </HStack>
              </VStack>
            ) : (
              // Desktop layout: Original single row
              <HStack justify="space-between" align="center" mb={4} spacing={4}>
                {/* Left side - Size and Sort controls */}
                <HStack spacing={4} flex={1}>
                  {/* Thumbnail Size Slider - Compact */}
                  <HStack spacing={2} minW="200px">
                    <Text fontSize="sm" color="gray.600" minW="60px">Size:</Text>
                    <Slider
                      value={thumbnailSize}
                      onChange={setThumbnailSize}
                      min={80}
                      max={200}
                      step={10}
                      width="120px"
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                    <Text fontSize="sm" color="gray.500" minW="35px">{thumbnailSize}</Text>
                  </HStack>

                  {/* Sort Controls - Compact */}
                  <HStack spacing={2}>
                    <Text fontSize="sm" color="gray.600">Sort:</Text>
                    <Select
                      size="sm"
                      value={sortMode}

                      onChange={(e) => setSortMode(e.target.value)}
                      width="100px"
                    >
                      <option value="cost">Cost</option>
                      <option value="name">Name</option>
                      <option value="category">Category</option>
                      <option value="color">Color</option>
                      <option value="count">Count</option>
                    </Select>
                    <Tooltip label={sortReverse ? 'Sort ascending' : 'Sort descending'}>
                      <IconButton
                        icon={sortReverse ? <BsSortUp /> : <BsSortDown />}
                        size="sm"
                        variant="outline"
                        onClick={() => setSortReverse(!sortReverse)}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>

                {/* Right side - Empty for cleaner layout */}
                <Box></Box>
              </HStack>
            )}

            {/* Cards Grid */}
            <Box
              flex="1"
              bg="gray.50"
              borderRadius="md"
              p={2}
              border="2px solid"
              borderColor="gray.200"
              overflowY="auto"
              maxH="500px"
            >
              <Grid
                templateColumns={`repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`}
                gap={2}
                justifyItems="center"
                p={0}
              >
                {sortedCards.map((item, index) => {
                  const cardData = getCardData(item);
                  const itemCount = item.count || 1;

                  // Ensure the item structure is consistent with what DeckCard expects
                  const normalizedItem = {
                    card: cardData,
                    count: itemCount
                  };

                  return (
                    <DeckCard
                      key={`${cardData?.id}-${index}`}
                      item={normalizedItem}
                      onCardClick={handleCardClick}
                      isLeader={cardData?.category === 'LEADER'}
                      isViewOnly={true}
                      thumbnailSize={thumbnailSize}
                    />
                  );
                })}
              </Grid>
            </Box>
          </TabPanel>

          <TabPanel>
            {/* Deck Stats */}
            {showStats && (
              <Box
                bg="white"
                p={4}
                borderRadius="md"
                border="1px"
                borderColor="gray.200"
                shadow="sm"
              >
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Statistics
                    </Text>
                    <Badge colorScheme={stats.hasLeader ? 'green' : 'red'} variant="subtle">
                      {stats.hasLeader ? 'Valid' : 'No Leader'}
                    </Badge>
                  </HStack>
                  {/* Basic Stats */}
                  <StatGroup>
                    <Stat>
                      <StatLabel>Total Cards</StatLabel>
                      <StatNumber>{stats.totalCards}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Unique Cards</StatLabel>
                      <StatNumber>{stats.uniqueCards}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Avg Counter</StatLabel>
                      <StatNumber>{stats.averageCounterValue}</StatNumber>
                    </Stat>
                  </StatGroup>

                  {/* Cost Distribution Chart */}
                  {Object.keys(stats.costDistribution).length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
                        Cost Distribution
                      </Text>
                      <Box h="120px">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(stats.costDistribution).map(([cost, count]) => ({
                            cost: cost === '0' ? '0' : cost,
                            count
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="cost" />
                            <YAxis />
                            <Bar dataKey="count" fill={colorScheme === 'blue' ? '#3182ce' : '#e53e3e'} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  )}

                  {/* Color Distribution */}
                  {Object.keys(stats.colorDistribution).length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                        Colors
                      </Text>
                      <Wrap spacing={1}>
                        {Object.entries(stats.colorDistribution).map(([color, count]) => (
                          <WrapItem key={color}>
                            <HStack spacing={2}>
                              <Circle size="12px" bg={getColorHex(color)} />
                              <Tag size="sm" variant="outline">
                                <TagLabel>{getColorName(color)}: {count}</TagLabel>
                              </Tag>
                            </HStack>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Effects (Keyword Counts) */}
                  {Object.keys(stats.keywordCounts).length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                        Effects
                      </Text>
                      <Wrap spacing={1}>
                        {Object.entries(stats.keywordCounts)
                          .filter(([keyword, count]) => count > 0)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([keyword, count]) => (
                            <WrapItem key={keyword}>
                              <Tag size="sm" variant="outline" borderColor="black" color="black">
                                <TagLabel>{keyword}: {count}</TagLabel>
                              </Tag>
                            </WrapItem>
                          ))}
                      </Wrap>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}
          </TabPanel>
          <TabPanel>
            {/* Keywords - List Layout */}
            {Object.keys(stats.keywordCounts).length > 0 && sortedCards.length > 0 ? (
              <VStack spacing={4} align="stretch">
                {Object.entries(stats.keywordCounts)
                  .filter(([keyword, count]) => count > 0)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([keyword, count]) => {
                    // Find cards with this keyword
                    const cardsWithKeyword = sortedCards.filter(item => {
                      const cardData = getCardData(item);
                      const cardKeywords = extractStyledKeywords(cardData?.effect, cardData?.trigger_effect);
                      return cardKeywords[keyword] > 0;
                    });

                    return (
                      <Box key={keyword} bg="white" p={3} borderRadius="md" border="1px" borderColor="gray.200">
                        <VStack align="stretch" spacing={2}>
                          <HStack justify="space-between">
                            <Tag size="md" variant="outline" borderColor="black" color="black">
                              <TagLabel fontWeight="semibold">{keyword}</TagLabel>
                            </Tag>
                            <Badge colorScheme="gray">{count} total</Badge>
                          </HStack>

                          <Wrap spacing={2}>
                            {cardsWithKeyword.map((item, index) => {
                              const cardData = getCardData(item);
                              return (
                                <WrapItem key={`${cardData?.id}-${index}`}>
                                  <Box
                                    position="relative"
                                    cursor="pointer"
                                    onClick={() => handleCardClick(item)}
                                    _hover={{ transform: 'scale(1.05)' }}
                                    transition="transform 0.2s"
                                  >
                                    <Image
                                      src={cardData?.image_url}
                                      alt={cardData?.name}
                                      width="60px"
                                      height="84px"
                                      objectFit="cover"
                                      borderRadius="sm"
                                      border={cardData?.category === 'LEADER' ? '2px solid gold' : '1px solid gray'}
                                    />
                                    {/* Card count badge */}
                                    <Badge
                                      position="absolute"
                                      top="-8px"
                                      right="-8px"
                                      colorScheme="blue"
                                      variant="solid"
                                      borderRadius="full"
                                      fontSize="xs"
                                      minW="20px"
                                      textAlign="center"
                                    >
                                      {item.count}
                                    </Badge>
                                    {/* Card name tooltip */}
                                    <Tooltip label={cardData.name} placement="top">
                                      <Box
                                        position="absolute"
                                        bottom="0"
                                        left="0"
                                        right="0"
                                        bg="blackAlpha.700"
                                        color="white"
                                        fontSize="xs"
                                        p={1}
                                        textAlign="center"
                                        borderBottomRadius="sm"
                                      >
                                        <Text noOfLines={1}>{cardData.name}</Text>
                                      </Box>
                                    </Tooltip>
                                  </Box>
                                </WrapItem>
                              );
                            })}
                          </Wrap>
                        </VStack>
                      </Box>
                    );
                  })}
              </VStack>
            ) : (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No keywords found in this deck</Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={isCardDetailOpen}
        onClose={onCardDetailClose}
        selectedCard={selectedCardForDetail}
        interactive={false}
      />
    </VStack>
  );
};

export default DeckViewerCanvas;
