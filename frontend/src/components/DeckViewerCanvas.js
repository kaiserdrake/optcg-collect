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
  Circle
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
    const costDist = {};
    const colorDist = {};
    const categoryDist = {};
    const keywordCounts = {};
    let totalCounterValue = 0;
    let cardsWithCounters = 0;
    let counter1K = 0;
    let counter2K = 0;

    deck.cards.forEach(item => {
      const cardData = getCardData(item);
      if (!cardData) return;

      totalCards += item.count;

      // Count by category
      const category = cardData.category || 'Unknown';
      categoryDist[category] = (categoryDist[category] || 0) + item.count;

      // Check for leader
      if (category === 'LEADER') {
        leader = cardData;
      }

      // Count by cost (only for non-leaders)
      if (category !== 'LEADER') {
        const cost = cardData.cost || 0;
        costDist[cost] = (costDist[cost] || 0) + item.count;
      }

      // Count by color
      if (cardData.color) {
        const colors = cardData.color.split('/');
        colors.forEach(color => {
          const cleanColor = color.trim();
          colorDist[cleanColor] = (colorDist[cleanColor] || 0) + item.count;
        });
      }

      // Calculate counter values (excluding leaders)
      if (category !== 'LEADER' && cardData.counter) {
        totalCounterValue += cardData.counter * item.count;
        cardsWithCounters += item.count;

        // Count specific counter values
        if (cardData.counter === 1000) {
          counter1K += item.count;
        }
        if (cardData.counter === 2000) {
          counter2K += item.count;
        }
      }

      // Extract keywords from each card
      const cardKeywords = extractStyledKeywords(cardData.effect, cardData.trigger_effect);
      Object.entries(cardKeywords).forEach(([keyword, count]) => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + (count * item.count);
      });
    });

    const averageCounterValue = cardsWithCounters > 0 ? (totalCounterValue / cardsWithCounters).toFixed(1) : 0;

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
            This deck contains no cards
          </Text>
        </VStack>
      </Box>
    );
  }

  // Prepare data for charts
  const costChartData = Object.entries(stats.costDistribution)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([cost, count]) => ({
      cost: parseInt(cost),
      count,
      name: `${cost}`
    }));

  // Add missing cost values with 0 count for better visualization
  const maxCost = Math.max(...costChartData.map(d => d.cost), 10);
  const fullCostData = [];
  for (let i = 0; i <= maxCost; i++) {
    const existing = costChartData.find(d => d.cost === i);
    fullCostData.push(existing || { cost: i, count: 0, name: i.toString() });
  }
  // Add 10+ category if there are cards with cost > 10
  const highCostCount = Object.entries(stats.costDistribution)
    .filter(([cost]) => parseInt(cost) > 10)
    .reduce((sum, [, count]) => sum + count, 0);
  if (highCostCount > 0) {
    fullCostData.push({ cost: 11, count: highCostCount, name: '10+' });
  }

  const colorChartData = Object.entries(stats.colorDistribution).map(([color, count]) => {
    const hexColor = getColorHex(color);
    return {
      name: getColorName(color),
      value: count,
      fill: hexColor
    };
  });

  return (
    <VStack spacing={4} align="stretch" h="100%">
      <Tabs defaultIndex={0}>
        <TabList>
          <Tab>Deck</Tab>
          <Tab>Statistics</Tab>
          <Tab>Keywords</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* Compact Controls - All in one line */}
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
                      {stats.hasLeader ? 'Has Leader' : 'No Leader'}
                    </Badge>
                  </HStack>

                  <StatGroup>
                    <Stat>
                      <StatLabel fontSize="xs">Total Cards</StatLabel>
                      <StatNumber fontSize="md">{stats.totalCards}</StatNumber>
                    </Stat>

                    <Stat>
                      <StatLabel fontSize="xs">Unique Cards</StatLabel>

                      <StatNumber fontSize="md">{stats.uniqueCards}</StatNumber>
                    </Stat>
                  </StatGroup>

                  {/* Counter Statistics - Badge Style */}
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
                      Counter Stats
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      <Badge
                        colorScheme="blackAlpha"
                        bg="black"
                        color="white"
                        variant="solid"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                      >
                        ⚡ Avg: {stats.averageCounterValue}k / card
                      </Badge>
                      {stats.counter2K > 0 && (
                        <Badge
                          colorScheme="gray"
                          variant="solid"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="sm"
                        >
                          2k: {stats.counter2K}
                        </Badge>
                      )}
                      {stats.counter1K > 0 && (
                        <Badge
                          colorScheme="gray"
                          variant="solid"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="sm"
                        >
                          1k: {stats.counter1K}
                        </Badge>
                      )}
                    </HStack>
                  </Box>

                  {/* Cost Distribution Bar Chart */}
                  {fullCostData.length > 0 && fullCostData.some(d => d.count > 0) && (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                        Cost Curve
                      </Text>
                      <Box h="300px" bg="white" borderRadius="lg" p={4} border="1px solid" borderColor="gray.200">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={fullCostData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                            barCategoryGap="10%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis
                              dataKey="name"
                              fontSize={8}
                              stroke="#2D3748"
                              tick={{ fill: '#2D3748' }}
                              axisLine={{ stroke: '#A0AEC0' }}
                              tickLine={{ stroke: '#A0AEC0' }}
                            />
                            <YAxis
                              fontSize={8}
                              stroke="#2D3748"
                              tick={{ fill: '#2D3748' }}

                              axisLine={{ stroke: '#A0AEC0' }}
                              tickLine={{ stroke: '#A0AEC0' }}
                              label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#2D3748' } }}
                            />
                            <Bar
                              dataKey="count"
                              fill="#1A202C"
                              radius={[4, 4, 0, 0]}
                              label={{
                                position: 'top',
                                fontSize: 8,
                                fill: '#2D3748',
                                formatter: (value) => value > 0 ? value : ''
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  )}

                  {/* Color Distribution Pie Chart */}
                  {colorChartData.length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
                        Color Distribution
                      </Text>
                      <Box h="200px">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={colorChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                              labelStyle={{ fontSize: 7, fill: '#2D3748' }}
                            >
                              {colorChartData.map((entry, index) => (

                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  )}

                  {/* Category Distribution */}
                  {Object.keys(stats.categoryDistribution).length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                        Category Distribution
                      </Text>
                      <Wrap spacing={1}>
                        {Object.entries(stats.categoryDistribution).map(([category, count]) => (
                          <WrapItem key={category}>
                            <Tag size="sm" variant="outline" borderColor="black" color="black">
                              <TagLabel>{category}: {count}</TagLabel>
                            </Tag>
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
              <VStack spacing={6} align="stretch">
                {Object.entries(stats.keywordCounts)
                  .filter(([keyword, count]) => count > 0)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([keyword, totalCount]) => {
                    // Find all cards that have this keyword
                    const cardsWithKeyword = sortedCards.filter(item => {
                      const cardData = getCardData(item);
                      if (!cardData) return false;
                      const cardKeywords = extractStyledKeywords(cardData.effect, cardData.trigger_effect);
                      return cardKeywords[keyword] && cardKeywords[keyword] > 0;
                    });

                    if (cardsWithKeyword.length === 0) return null;

                    return (
                      <Box key={keyword}>
                        <HStack mb={3} align="center">
                          <Text fontSize="lg" fontWeight="bold" color="gray.700">
                            • Cards with
                          </Text>

                          <StyledTextRenderer text={`[${keyword}]`} />
                          <Text fontSize="lg" fontWeight="bold" color="gray.700">
                            ({totalCount} total)
                          </Text>
                        </HStack>
                        <Wrap spacing={3}>
                          {cardsWithKeyword.map((item, index) => {

                            const cardData = getCardData(item);
                            if (!cardData) return null;

                            return (
                              <WrapItem key={`${cardData.id}-${index}`}>
                                <Box
                                  position="relative"
                                  cursor="pointer"
                                  onClick={() => handleCardClick(item)}
                                  _hover={{ transform: 'scale(1.05)' }}
                                  transition="transform 0.2s"
                                >
                                  <Image
                                    src={cardData.img_url || '/placeholder.png'}

                                    alt={cardData.name || 'Card'}
                                    width="60px"
                                    height="84px"
                                    objectFit="cover"
                                    borderRadius="sm"
                                    border={cardData.category === 'LEADER' ?
                                      '2px solid gold' : '1px solid gray'}
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
