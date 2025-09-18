'use client';
import { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  HStack, Text, Box, Button, Square, VStack, Flex, Divider,
  useColorModeValue, Icon, Badge, RadioGroup, Radio, Stack
} from '@chakra-ui/react';
import { FiMapPin, FiSettings, FiPackage } from 'react-icons/fi';

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

// Helper: Get a lighter background color for the location option
const getLocationBgColor = (marker, isSelected) => {
  const baseColors = {
    red: isSelected ? 'red.50' : 'red.25',
    orange: isSelected ? 'orange.50' : 'orange.25',
    yellow: isSelected ? 'yellow.50' : 'yellow.25',
    green: isSelected ? 'green.50' : 'green.25',
    blue: isSelected ? 'blue.50' : 'blue.25',
    purple: isSelected ? 'purple.50' : 'purple.25',
    pink: isSelected ? 'pink.50' : 'pink.25',
    gray: isSelected ? 'gray.50' : 'gray.25',
  };
  return baseColors[marker] || (isSelected ? 'blue.50' : 'gray.50');
};

const SetLocationModal = ({ isOpen, onClose, card, onLocationSet, onManageLocations }) => {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(card?.location?.id || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Theme-aware colors
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const iconColor = useColorModeValue('blue.500', 'blue.300');

  useEffect(() => {
    if (isOpen) {
      setSelectedLocationId(card?.location?.id || '');
      setLoading(true);
      fetch(`${api}/api/locations`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setLocations(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, card, api]);

  const handleSave = async () => {
    if (!card) return;

    setSaving(true);
    try {
      const res = await fetch(`${api}/api/collection/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId: card.id,
          locationId: selectedLocationId || null
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onClose();
        if (onLocationSet) {
          onLocationSet();
        }
      } else {
        console.error('Location update failed:', data.message);
      }
    } catch (error) {
      console.error('Network error updating location:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedLocation = selectedLocationId
    ? locations.find(l => String(l.id) === String(selectedLocationId))
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="md"
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(8px)" />
      <ModalContent
        mx={4}
        borderRadius="2xl"
        boxShadow="2xl"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
        bg={cardBgColor}
        maxH="85vh" // Limit height to ensure it fits on screen
      >
        {/* Sleek Header */}
        <ModalHeader
          bg={useColorModeValue('white', 'gray.800')}
          py={5}
          px={6}
          borderBottom="1px solid"
          borderColor={borderColor}
          flexShrink={0} // Prevent header from shrinking
        >
          <HStack spacing={3}>
            <Square
              size="10"
              bg={useColorModeValue('blue.50', 'blue.900')}
              borderRadius="xl"
              color={iconColor}
            >
              <FiMapPin size="20" />
            </Square>
            <VStack align="start" spacing={1} flex={1}>
              <Text fontSize="xl" fontWeight="bold" lineHeight={1.2}>
                Set Location
              </Text>
              <Text fontSize="sm" color={textSecondary} lineHeight={1.2}>
                {card?.name || card?.card_code}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton top={5} right={6} />

        {/* Scrollable Body */}
        <ModalBody px={6} py={6} bg={cardBgColor} overflowY="auto">
          <VStack spacing={5} align="stretch">
            {/* Current Location Display */}
            {card?.location?.name && (
              <Box
                p={4}
                bg={getLocationBgColor(card.location.marker || 'gray', true)}
                borderRadius="xl"
                border="2px solid"
                borderColor={markerColorToColor(card.location.marker || 'gray')}
              >
                <HStack spacing={3}>
                  <Square
                    size="8"
                    bg={markerColorToColor(card.location.marker || 'gray')}
                    borderRadius="lg"
                    color="white"
                  >
                    <FiMapPin size="16" />
                  </Square>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold" fontSize="sm" color="gray.700">
                      Current Location
                    </Text>
                    <Text fontWeight="semibold" color="gray.800">
                      {card.location.name}
                    </Text>
                    {card.location.description && (
                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                        {card.location.description}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Location Selection */}
            <Box>
              <Text mb={3} fontSize="sm" fontWeight="semibold" color={textSecondary}>
                Choose a location
              </Text>

              <RadioGroup
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                isDisabled={loading}
              >
                <Stack spacing={2}>
                  {/* No Location Option */}
                  <Box
                    p={4}
                    bg={!selectedLocationId ? useColorModeValue('gray.100', 'gray.700') : useColorModeValue('gray.25', 'gray.750')}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor={!selectedLocationId ? useColorModeValue('gray.300', 'gray.600') : 'transparent'}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      bg: useColorModeValue('gray.75', 'gray.725'),
                      transform: 'translateY(-1px)',
                      shadow: 'sm'
                    }}
                    onClick={() => setSelectedLocationId('')}
                  >
                    <HStack spacing={3}>
                      <Radio value="" size="lg" colorScheme="gray" />
                      <Square
                        size="8"
                        bg={useColorModeValue('gray.300', 'gray.600')}
                        borderRadius="lg"
                        color="white"
                      >
                        <FiMapPin size="16" />
                      </Square>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold" color="gray.700">
                          No Location
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Remove location assignment
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>

                  {/* Location Options */}
                  {locations.map(location => {
                    const isSelected = String(location.id) === String(selectedLocationId);
                    const markerColor = location.marker || 'gray';

                    return (
                      <Box
                        key={location.id}
                        p={4}
                        bg={getLocationBgColor(markerColor, isSelected)}
                        borderRadius="xl"
                        border="2px solid"
                        borderColor={isSelected ? markerColorToColor(markerColor) : 'transparent'}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{
                          transform: 'translateY(-1px)',
                          shadow: 'sm',
                          bg: getLocationBgColor(markerColor, true)
                        }}
                        onClick={() => setSelectedLocationId(String(location.id))}
                      >
                        <HStack spacing={3}>
                          <Radio value={String(location.id)} size="lg" colorScheme={markerColor} />
                          <Square
                            size="8"
                            bg={markerColorToColor(markerColor)}
                            borderRadius="lg"
                            color="white"
                          >
                            <FiMapPin size="16" />
                          </Square>
                          <VStack align="start" spacing={0} flex={1}>
                            <HStack spacing={2} align="center">
                              <Text fontWeight="semibold" color="gray.800">
                                {location.name}
                              </Text>
                              {location.type && (
                                <Badge
                                  size="sm"
                                  colorScheme={markerColor}
                                  variant="subtle"
                                  borderRadius="md"
                                >
                                  {location.type}
                                </Badge>
                              )}
                            </HStack>
                            {location.description && (
                              <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                {location.description}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                      </Box>
                    );
                  })}
                </Stack>
              </RadioGroup>

              {/* Loading state */}
              {loading && (
                <Box textAlign="center" py={8}>
                  <Text fontSize="sm" color={textSecondary}>
                    Loading locations...
                  </Text>
                </Box>
              )}

              {/* Empty state */}
              {!loading && locations.length === 0 && (
                <Box textAlign="center" py={8}>
                  <Text fontSize="sm" color={textSecondary} mb={3}>
                    No locations available
                  </Text>
                  <Button
                    size="sm"
                    leftIcon={<FiSettings />}
                    variant="outline"
                    colorScheme="blue"
                    onClick={onManageLocations}
                  >
                    Create Location
                  </Button>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Help Text */}
            <Flex
              p={3}
              bg={useColorModeValue('blue.50', 'blue.900')}
              borderRadius="lg"
              align="center"
            >
              <Icon as={FiSettings} color={iconColor} mr={2} boxSize={4} />
              <Text fontSize="xs" color={textSecondary}>
                Manage your locations and marker colors from the settings
              </Text>
            </Flex>
          </VStack>
        </ModalBody>

        {/* Compact Footer */}
        <ModalFooter
          bg={useColorModeValue('gray.50', 'gray.750')}
          borderTop="1px solid"
          borderColor={borderColor}
          py={4}
          px={6}
          flexShrink={0} // Prevent footer from shrinking
        >
          <HStack spacing={3} w="full" justify="space-between">
            <Button
              leftIcon={<FiSettings />}
              variant="ghost"
              size="sm"
              onClick={onManageLocations}
              color={textSecondary}
              _hover={{
                color: iconColor,
                bg: useColorModeValue('gray.100', 'gray.700')
              }}
            >
              Manage Locations
            </Button>

            <HStack spacing={2}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                color={textSecondary}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={handleSave}
                isLoading={saving}
                loadingText="Saving"
                leftIcon={!saving ? <FiPackage /> : undefined}
                px={6}
                borderRadius="lg"
                fontWeight="semibold"
              >
                {saving ? 'Saving' : 'Update Location'}
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SetLocationModal;
