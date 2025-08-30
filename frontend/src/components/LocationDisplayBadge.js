'use client';

import { Tag, HStack, Text, Tooltip } from '@chakra-ui/react';
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

  return (
    <Tooltip label={location?.name ? `Location: ${location.name}` : 'Assign a location to this card'}>
      <Tag
        size="sm"
        cursor="pointer"
        borderRadius="md"
        variant="outline"
        fontWeight="medium"
        borderColor={color}
        color={color}
        bg="transparent"
        px={2}
        py={1}
        _hover={{
          opacity: 0.85,
          boxShadow: 'md',
          bg: `${marker}.50`
        }}
        onClick={e => {
          e.stopPropagation();
          onClick && onClick(card);
        }}
        tabIndex={0}
      >
        <HStack spacing={1}>
          <FiMapPin />
          <Text fontSize="xs" color={color}>{text}</Text>
        </HStack>
      </Tag>
    </Tooltip>
  );
};

export default LocationDisplayBadge;
