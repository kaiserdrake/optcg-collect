'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Button, Checkbox, Select, FormControl, FormLabel,
  useToast, Spinner, Tag, Flex, Divider, Icon
} from '@chakra-ui/react';
import { FiMapPin, FiBox, FiBookOpen } from 'react-icons/fi';
import { getLocationMarkerBg, getLocationColorScheme } from '@/utils/cardStyles';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper to get icon for location type
const getLocationTypeIcon = (type) => {
  switch (type) {
    case 'case': return FiBox;
    case 'box': return FiBox;
    case 'binder': return FiBookOpen;
    default: return FiMapPin;
  }
};

const SetCardInstanceLocationsModal = ({ isOpen, onClose, card, onLocationUpdated, onModalStateChange }) => {
  const [instances, setInstances] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toast = useToast();

  // Notify parent when modal opens/closes to hide CardDetailModal
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(isOpen);
    }
  }, [isOpen, onModalStateChange]);

  // Fetch card instances when modal opens
  useEffect(() => {
    if (isOpen && card?.id) {
      fetchInstances();
      fetchLocations();
    }
  }, [isOpen, card]);

  const fetchInstances = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${api}/api/cards/${card.id}/instances`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch card instances',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast({
        title: 'Error',
        description: 'Failed to load card instances',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${api}/api/locations`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleSelectAll = () => {
    setSelectedInstances(instances.map(inst => inst.instance_id));
  };

  const handleUnselectAll = () => {
    setSelectedInstances([]);
  };

  const handleToggleInstance = (instanceId, checked) => {
    if (checked) {
      setSelectedInstances(prev => [...prev, instanceId]);
    } else {
      setSelectedInstances(prev => prev.filter(id => id !== instanceId));
    }
  };

  const handleApply = async () => {
    if (selectedInstances.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one card to update',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsApplying(true);
    try {
      const updates = selectedInstances.map(instanceId => ({
        instance_id: instanceId,
        location_id: selectedLocationId
      }));

      const response = await fetch(
        `${api}/api/cards/${card.id}/instances/locations`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ updates })
        }
      );

      if (response.ok) {
        toast({
          title: 'Locations Updated',
          description: `Successfully updated ${selectedInstances.length} card(s)`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // Refresh instances to show updated locations
        await fetchInstances();

        // Clear selection after successful update
        setSelectedInstances([]);
        setSelectedLocationId(null);

        // Notify parent component
        if (onLocationUpdated) {
          onLocationUpdated();
        }

        // Don't close modal - user requested to keep it open
      } else {
        const errorData = await response.json();
        toast({
          title: 'Update Failed',
          description: errorData.message || 'Failed to update locations',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error updating locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card locations',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedInstances([]);
    setSelectedLocationId(null);
    onClose();
  };

  // Group instances by type for display
  const ownedInstances = instances.filter(inst => !inst.is_proxy);
  const proxyInstances = instances.filter(inst => inst.is_proxy);

  // Get selected location details for display
  const selectedLocation = selectedLocationId
    ? locations.find(loc => loc.id === selectedLocationId)
    : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <HStack spacing={2}>
              <FiMapPin />
              <Text>Set Card Locations</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="normal" color="gray.600">
              {card?.name || card?.card_code}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {isLoading ? (
              <Flex justify="center" py={8}>
                <Spinner size="lg" />
              </Flex>
            ) : (
              <>
                {/* Select All / Unselect All Buttons */}
                <HStack spacing={2} justify="space-between">
                  <Button size="sm" onClick={handleSelectAll} variant="outline">
                    Select All
                  </Button>
                  <Button size="sm" onClick={handleUnselectAll} variant="outline">
                    Unselect All
                  </Button>
                </HStack>

                {/* Instance List */}
                <Box
                  maxH="300px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}
                >
                  <VStack align="stretch" spacing={2}>
                    {ownedInstances.length > 0 && (
                      <>
                        {ownedInstances.map((instance, index) => (
                          <Checkbox
                            key={instance.instance_id}
                            isChecked={selectedInstances.includes(instance.instance_id)}
                            onChange={(e) => handleToggleInstance(instance.instance_id, e.target.checked)}
                          >
                            <HStack spacing={3} w="full">
                              <Text fontWeight="medium">Card #{index + 1}</Text>
                              {instance.location ? (
                                <Tag
                                  size="sm"
                                  bg={getLocationMarkerBg(instance.location.marker)}
                                  color="white"
                                  fontWeight="bold"
                                >
                                  {instance.location.name}
                                </Tag>
                              ) : (
                                <Tag
                                  size="sm"
                                  bg="gray.400"
                                  color="white"
                                  fontWeight="bold"
                                >
                                  No Location
                                </Tag>
                              )}
                            </HStack>
                          </Checkbox>
                        ))}
                      </>
                    )}

                    {proxyInstances.length > 0 && (
                      <>
                        {ownedInstances.length > 0 && <Divider my={2} />}
                        {proxyInstances.map((instance, index) => (
                          <Checkbox
                            key={instance.instance_id}
                            isChecked={selectedInstances.includes(instance.instance_id)}
                            onChange={(e) => handleToggleInstance(instance.instance_id, e.target.checked)}
                          >
                            <HStack spacing={3} w="full">
                              <Text fontWeight="medium">Proxy #{index + 1}</Text>
                              {instance.location ? (
                                <Tag
                                  size="sm"
                                  bg={getLocationMarkerBg(instance.location.marker)}
                                  color="white"
                                  fontWeight="bold"
                                >
                                  {instance.location.name}
                                </Tag>
                              ) : (
                                <Tag
                                  size="sm"
                                  bg="gray.400"
                                  color="white"
                                  fontWeight="bold"
                                >
                                  No Location
                                </Tag>
                              )}
                            </HStack>
                          </Checkbox>
                        ))}
                      </>
                    )}

                    {instances.length === 0 && (
                      <Text color="gray.500" textAlign="center" py={4}>
                        No card instances found
                      </Text>
                    )}
                  </VStack>
                </Box>

                <Divider />

                {/* Location Selector with Details */}
                <FormControl>
                  <FormLabel>Set Location for Selected Cards</FormLabel>
                  <Select
                    placeholder="Select location"
                    value={selectedLocationId ?? ''}
                    onChange={(e) => setSelectedLocationId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Remove Location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </Select>

                  {/* Location Details Display */}
                  {selectedLocation && (
                    <Box
                      mt={2}
                      p={3}
                      bg={getLocationMarkerBg(selectedLocation.marker)}
                      borderRadius="md"
                      color="white"
                    >
                      <VStack align="stretch" spacing={2}>
                        <HStack spacing={2}>
                          <Icon
                            as={getLocationTypeIcon(selectedLocation.type)}
                            color="white"
                          />
                          <Text fontWeight="bold" fontSize="sm">
                            {selectedLocation.name}
                          </Text>
                          <Tag
                            size="sm"
                            bg="whiteAlpha.300"
                            color="white"
                            fontWeight="bold"
                          >
                            {selectedLocation.marker}
                          </Tag>
                        </HStack>

                        <HStack spacing={4} fontSize="xs">
                          <Text>
                            <Text as="span" fontWeight="semibold">Type:</Text> {selectedLocation.type}
                          </Text>
                        </HStack>

                        {selectedLocation.description && (
                          <Text fontSize="xs">
                            <Text as="span" fontWeight="semibold">Description:</Text> {selectedLocation.description}
                          </Text>
                        )}

                        {selectedLocation.notes && (
                          <Text fontSize="xs" fontStyle="italic">
                            {selectedLocation.notes}
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  )}
                </FormControl>

                {/* Selection Count */}
                <Text fontSize="sm" color="gray.600">
                  {selectedInstances.length > 0
                    ? `${selectedInstances.length} card(s) selected`
                    : 'No cards selected'}
                </Text>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2}>
            <Button onClick={handleClose} isDisabled={isApplying}>
              Close
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleApply}
              isLoading={isApplying}
              isDisabled={selectedInstances.length === 0 || isLoading}
              loadingText="Applying..."
            >
              Apply
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SetCardInstanceLocationsModal;
