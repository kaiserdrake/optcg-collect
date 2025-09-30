'use client';

import { Tag, HStack, Text } from '@chakra-ui/react';
import { FiMapPin } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { getLocationMarkerBg } from '@/utils/cardStyles';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const LocationDisplayBadge = ({ card, onClick }) => {
  const [locationSummary, setLocationSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Early return if card is not provided or invalid
  if (!card) return null;

  const owned = card.owned_count || 0;
  const proxy = card.proxy_count || 0;
  const hasCard = owned > 0 || proxy > 0;

  if (!hasCard) return null;

  // Fetch location summary when component mounts or card changes
  useEffect(() => {
    if (hasCard && card.id) {
      fetchLocationSummary();
    }
  }, [card.id, hasCard]);

  // Listen for location updates
  useEffect(() => {
    if (!card?.id) return;

    const handleLocationUpdate = (event) => {
      const { cardId } = event.detail;
      // If this card was updated, refetch location summary
      if (cardId === card.id) {
        fetchLocationSummary();
      }
    };

    window.addEventListener('card:location_updated', handleLocationUpdate);

    return () => {
      window.removeEventListener('card:location_updated', handleLocationUpdate);
    };
  }, [card?.id]);

  const fetchLocationSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${api}/api/cards/${card.id}/instances`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const instances = data.instances || [];

        // Build location summary with marker info
        const summary = {};
        instances.forEach(instance => {
          const locationKey = instance.location?.name || 'No Location';
          if (!summary[locationKey]) {
            summary[locationKey] = {
              count: 0,
              marker: instance.location?.marker || 'gray'
            };
          }
          summary[locationKey].count++;
        });

        setLocationSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching location summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBadgeClick = (e) => {
    // Stop both propagation and default behavior
    e.preventDefault();
    e.stopPropagation();

    // Also stop immediate propagation to prevent any parent handlers
    if (e.stopImmediatePropagation) {
      e.stopImmediatePropagation();
    }

    // Call the location onClick handler if it exists and card is valid
    if (onClick && card) {
      onClick(card);
    }
  };

  // If loading or no summary yet
  if (isLoading || !locationSummary) {
    return (
      <Tag
        size="sm"
        bg="gray.500"
        color="white"
        cursor="pointer"
        onClick={handleBadgeClick}
      >
        <HStack spacing={1}>
          <FiMapPin />
          <Text fontSize="xs">Loading...</Text>
        </HStack>
      </Tag>
    );
  }

  // Build location entries (exclude "No Location")
  const locationEntries = Object.entries(locationSummary)
    .filter(([name]) => name !== 'No Location')
    .map(([name, data]) => ({
      name,
      count: data.count,
      marker: data.marker
    }));

  const unlocatedCount = locationSummary['No Location']?.count || 0;

  // If no locations set at all, show "Set Location" button
  if (locationEntries.length === 0 && unlocatedCount > 0) {
    return (
      <Tag
        size="sm"
        bg="gray.500"
        color="white"
        cursor="pointer"
        onClick={handleBadgeClick}
        _hover={{ opacity: 0.8 }}
      >
        <HStack spacing={1}>
          <FiMapPin />
          <Text fontSize="xs" fontWeight="bold">Set Location</Text>
        </HStack>
      </Tag>
    );
  }

  // If there are no location entries at all (all unlocated), don't show anything
  if (locationEntries.length === 0) {
    return null;
  }

  // Render only location badges (no "No Location" badge)
  return (
    <HStack spacing={1} flexWrap="wrap" onClick={handleBadgeClick} cursor="pointer">
      {locationEntries.map((location, index) => (
        <Tag
          key={`${location.name}-${index}`}
          size="sm"
          bg={getLocationMarkerBg(location.marker)}
          color="white"
          fontWeight="bold"
          _hover={{ opacity: 0.8 }}
        >
          <Text fontSize="xs">
            {location.count}×{location.name}
          </Text>
        </Tag>
      ))}
    </HStack>
  );
};

export default LocationDisplayBadge;
