'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Heading,
  SimpleGrid,
  Collapse,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
  Badge,
  Flex,
  Progress,
  IconButton,
} from '@chakra-ui/react';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Color mappings for One Piece card colors
const colorMappings = {
  'Red': { name: 'Red', hex: '#ef4444' },
  'Blue': { name: 'Blue', hex: '#3b82f6' },
  'Green': { name: 'Green', hex: '#10b981' },
  'Yellow': { name: 'Yellow', hex: '#f59e0b' },
  'Purple': { name: 'Purple', hex: '#8b5cf6' },
  'Black': { name: 'Black', hex: '#374151' },
  'Multi': { name: 'Multi', hex: '#f97316' },
  '': { name: 'Colorless', hex: '#6b7280' }
};

// Modern Stat component
const StatBox = ({ label, number, helpText, ...props }) => (
  <Box
    p={3}
    bg="white"
    borderRadius="lg"
    textAlign="center"
    position="relative"
    overflow="hidden"
    _before={{
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      bg: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    }}
    {...props}
  >
    <Text fontSize="xs" color="gray.500" mb={1} fontWeight="medium">{label}</Text>
    <Text fontSize="xl" fontWeight="bold" mb={0} color="gray.800">{number}</Text>
    <Text fontSize="2xs" color="gray.400">{helpText}</Text>
  </Box>
);

// Modern Pie Chart Component
const ModernPieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const createSlice = (item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    currentAngle += angle;

    return (
      <path
        key={index}
        d={pathData}
        fill={item.color}
        opacity="0.9"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}
      />
    );
  };

  return (
    <Box>
      <Heading size="sm" mb={3} color="gray.700">{title}</Heading>
      <VStack spacing={3}>
        <svg width="160" height="160" viewBox="0 0 100 100">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2"/>
            </filter>
          </defs>
          {data.map((item, index) => createSlice(item, index))}
          <circle cx="50" cy="50" r="15" fill="white" opacity="0.9" />
        </svg>
        <VStack spacing={1} align="stretch" w="100%">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <HStack key={index} justify="space-between" fontSize="xs">
                <HStack spacing={2}>
                  <Box w={2} h={2} bg={item.color} borderRadius="full" />
                  <Text color="gray.600" fontWeight="medium">{item.name}</Text>
                </HStack>
                <Text color="gray.500" fontWeight="semibold">{percentage}%</Text>
              </HStack>
            );
          })}
        </VStack>
      </VStack>
    </Box>
  );
};

// Modern Bar Chart Component
const ModernBarChart = ({ data, title, gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }) => {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <Box>
      <Heading size="sm" mb={3} color="gray.700">{title}</Heading>
      <VStack spacing={2} align="stretch">
        {data.slice(0, 8).map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <Box key={index}>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="medium" color="gray.600">{item.name}</Text>
                <Text fontSize="xs" color="gray.500" fontWeight="semibold">{item.value}</Text>
              </HStack>
              <Box
                h="6px"
                bg="gray.100"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  h="100%"
                  w={`${percentage}%`}
                  bg={gradient}
                  borderRadius="full"
                  transition="width 0.8s ease-out"
                />
              </Box>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

// Modern Timeline Chart Component
const ModernTimelineChart = ({ data, title }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(item => item.count), 1);
  const chartHeight = 120;
  const chartWidth = 320;
  const padding = 30;

  return (
    <Box>
      <Heading size="sm" mb={3} color="gray.700">{title}</Heading>
      <Box overflowX="auto" bg="gray.50" borderRadius="lg" p={3}>
        <svg width={chartWidth} height={chartHeight + padding} style={{ minWidth: '300px' }}>
          <defs>
            <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1"/>
              <stop offset="100%" stopColor="#8b5cf6"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => {
            const y = padding/2 + (chartHeight - padding) * (1 - percent/100);
            return (
              <line
                key={percent}
                x1={padding}
                y1={y}
                x2={chartWidth - padding/2}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}

          {/* Area fill */}
          <path
            fill="url(#timelineGradient)"
            d={`M ${padding} ${chartHeight} ` +
               data.map((item, index) => {
                 const x = padding + (index * (chartWidth - padding * 1.5)) / (data.length - 1);
                 const y = padding/2 + (chartHeight - padding) * (1 - item.count / maxValue);
                 return `L ${x} ${y}`;
               }).join(' ') +
               ` L ${padding + (chartWidth - padding * 1.5)} ${chartHeight} Z`}
          />

          {/* Chart line */}
          <path
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d={data.map((item, index) => {
              const x = padding + (index * (chartWidth - padding * 1.5)) / (data.length - 1);
              const y = padding/2 + (chartHeight - padding) * (1 - item.count / maxValue);
              return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            }).join(' ')}
          />

          {/* Data points */}
          {data.map((item, index) => {
            if (item.count > 0) {
              const x = padding + (index * (chartWidth - padding * 1.5)) / (data.length - 1);
              const y = padding/2 + (chartHeight - padding) * (1 - item.count / maxValue);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#4f46e5"
                  stroke="white"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                />
              );
            }
            return null;
          })}
        </svg>
      </Box>
      <Text fontSize="2xs" color="gray.400" mt={2}>
        Cards added over the last 30 days
      </Text>
    </Box>
  );
};

const CollectionStatistics = () => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (isOpen && !stats) {
      fetchCollectionStats();
    }
  }, [isOpen]);

  const fetchCollectionStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${api}/api/collection/statistics`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collection statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setStats(null);
    fetchCollectionStats();
  };

  const renderColorPieChart = () => {
    if (!stats?.colorDistribution) return null;

    const colorData = Object.entries(stats.colorDistribution)
      .filter(([, count]) => count > 0)
      .map(([color, count]) => ({
        name: colorMappings[color]?.name || color || 'Colorless',
        value: count,
        color: colorMappings[color]?.hex || '#6b7280'
      }));

    return <ModernPieChart data={colorData} title="Color Distribution" />;
  };

  const renderPackDistribution = () => {
    if (!stats?.packDistribution) return null;

    const packData = Object.entries(stats.packDistribution)
      .filter(([, count]) => count > 0)
      .map(([pack, count]) => ({
        name: pack || 'Unknown',
        value: count
      }))
      .sort((a, b) => b.value - a.value);

    if (packData.length === 0) return null;

    return <ModernBarChart
      data={packData}
      title="Cards by Pack Prefix"
      gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
    />;
  };

  const renderBlockDistribution = () => {
    if (!stats?.blockDistribution) return null;

    const blockData = Object.entries(stats.blockDistribution)
      .filter(([, count]) => count > 0)
      .map(([block, count]) => ({
        name: block !== 'Unknown' ? `Block ${block}` : 'Unknown',
        value: count
      }))
      .sort((a, b) => {
        const aNum = a.name.includes('Block') ? parseInt(a.name.replace('Block ', '')) : 999;
        const bNum = b.name.includes('Block') ? parseInt(b.name.replace('Block ', '')) : 999;
        return aNum - bNum;
      });

    return <ModernBarChart
      data={blockData}
      title="Cards by Block"
      gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
    />;
  };

  const renderRarityDistribution = () => {
    if (!stats?.rarityDistribution) return null;

    const rarityData = Object.entries(stats.rarityDistribution)
      .filter(([, count]) => count > 0)
      .map(([rarity, count]) => ({
        name: rarity || 'Unknown',
        value: count
      }))
      .sort((a, b) => b.value - a.value);

    return <ModernBarChart
      data={rarityData}
      title="Rarity Distribution"
      gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
    />;
  };

  const renderTimeline = () => {
    if (!stats?.timeline || stats.timeline.length === 0) return null;

    const timelineData = stats.timeline
      .slice(-30)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        date: item.date,
        count: item.count
      }));

    return <ModernTimelineChart data={timelineData} title="Collection Growth Timeline" />;
  };

  return (
    <Box border="1px" borderColor={borderColor} borderRadius="lg" mb={4}>
      <Button
        onClick={onToggle}
        variant="ghost"
        width="100%"
        justifyContent="space-between"
        p={3}
        borderRadius="lg"
        _hover={{ bg: bgColor }}
        fontSize="sm"
      >
        <Text fontSize="md" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
          Collection Statistics
        </Text>
        <HStack spacing={2}>
          {stats && (
            <IconButton
              icon={<Text fontSize="14px">🔄</Text>}
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              aria-label="Refresh statistics"
            />
          )}
          <Text fontSize="14px" color="gray.400">
            {isOpen ? '▲' : '▼'}
          </Text>
        </HStack>
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          {loading && (
            <Flex justify="center" py={6}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          )}

          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {stats && (
            <VStack spacing={6} align="stretch">
              {/* Summary Statistics */}
              <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
                <StatBox
                  label="Unique Cards"
                  number={stats.uniqueCardCount}
                  helpText="Different cards"
                />
                <StatBox
                  label="Total Cards"
                  number={stats.totalCardCount}
                  helpText="All instances"
                />
                <StatBox
                  label="Completion"
                  number={`${stats.completionRate.toFixed(1)}%`}
                  helpText="Of available"
                />
                <StatBox
                  label="Collection Age"
                  number={`${stats.collectionAge}d`}
                  helpText="Days collecting"
                />
                <StatBox
                  label="Avg Copies"
                  number={stats.additionalStats?.averageCardsPerUniqueCard?.toFixed(1) || '0'}
                  helpText="Per unique card"
                />
              </SimpleGrid>

              {/* Charts Grid */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {renderColorPieChart()}
                {renderRarityDistribution()}
                {renderPackDistribution()}
                {renderBlockDistribution()}
                {renderTimeline()}
              </SimpleGrid>
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default CollectionStatistics;
