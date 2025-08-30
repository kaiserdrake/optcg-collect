'use client';

import { Tag, HStack, Text, Tooltip, Box } from '@chakra-ui/react';
import { FiMapPin } from 'react-icons/fi';

// Helper: Chakra color for marker
const markerColorToColor = (marker) => {
  switch (marker) {
    case 'red': return 'red.500';
    case 'orange': return 'orange.500';
    case 'yellow': return 'yellow.400';
    case 'green': return 'green.500';
    case 'blue': return 'blue.500';
    case 'purple': return 'purple.500';
    case 'pink': return 'pink.400';
    case 'gray': return 'gray.500';
    default: return 'blue.500';
  }
};

// Truncate a string to maxLen, adding ellipsis if needed
const truncate = (str, maxLen = 80) => {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
};

const LocationDisplayBadge = ({ card, onClick }) => {
  const owned = card.owned_count || 0;
  const proxy = card.proxy_count || 0;
  const hasCard = owned > 0 || proxy > 0;
  if (!hasCard) return null;
  const location = card.location;
  let text, marker;
  if (owned > 0) {
    text = location?.name ? location.name : 'Set Location';
    marker = location?.marker || (location?.name ? 'gray' : 'gray');
  } else {
    return null;
  }
  const color = markerColorToColor(marker);

  // Tooltip content
  const tooltipContent = location?.name ? (
    <Box>
      <Text fontWeight="bold" fontSize="sm">
        Location: {location.name}
      </Text>
      <Text fontSize="xs" color="gray.600">
        Type: {location.type || '-'}
      </Text>
      {location.description && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {truncate(location.description, 80)}
        </Text>
      )}
      <Text fontSize="xs" color="gray.400" mt={1}>
        Click to change location
      </Text>
    </Box>
  ) : (
    <Box>
      <Text fontWeight="bold" fontSize="sm">
        Assign a location to this card
      </Text>
      <Text fontSize="xs" color="gray.400" mt={1}>
        Click to set location
      </Text>
    </Box>
  );

  // Style for "Set Location" (default) and with value
  const isDefault = !location?.name;
  const badgeStyles = isDefault
    ? {
        border: 'none',
        background: 'transparent',
        color: color,
        px: 2,
        py: 1,
        fontWeight: 'medium'
      }
    : {
        border: 'none',
        background: color,
        color: 'white',
        px: 2,
        py: 1,
        fontWeight: 'medium'
      };

  return (
    <Tooltip label={tooltipContent} hasArrow placement="top" maxW="320px" p={2} bg="white" color="black" boxShadow="md">
      <Tag
        size="sm"
        cursor="pointer"
        borderRadius="md"
        {...badgeStyles}
        _hover={{
          opacity: 0.85,
          boxShadow: 'md',
          bg: isDefault ? `${marker}.50` : color
        }}
        onClick={e => {
          e.stopPropagation();
          onClick && onClick(card);
        }}
        tabIndex={0}
      >
        <HStack spacing={1}>
          <FiMapPin />
          <Text fontSize="xs" color={badgeStyles.color}>{text}</Text>
        </HStack>
      </Tag>
    </Tooltip>
  );
};

export default LocationDisplayBadge;
