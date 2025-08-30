import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Tag, Grid, GridItem, Wrap, WrapItem,
  Flex, Heading, Button, Table, Tbody, Tr, Td, Select, FormControl, FormLabel,
  useToast
} from '@chakra-ui/react';
import { FiMapPin } from 'react-icons/fi';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';
import { getTagStyles } from '@/utils/cardStyles';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CardDetailModal = ({
  isOpen,
  onClose,
  selectedCard,
  showProxies,
  onCountUpdate
}) => {
  const [locations, setLocations] = useState([]);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${api}/api/locations`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      // Silently fail - locations are optional
      console.warn('Failed to fetch locations:', error);
    }
  };

  const handleLocationChange = async (locationId) => {
    if (!selectedCard) return;

    setIsUpdatingLocation(true);
    try {
      const res = await fetch(`${api}/api/collection/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cardId: selectedCard.id,
          locationId: locationId || null
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Location Updated',
          description: `Card location ${locationId ? 'updated' : 'removed'} successfully.`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // Update the card in the parent component
        if (onCountUpdate) {
          onCountUpdate(selectedCard.id, 'location_updated');
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update location',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  if (!selectedCard) return null;

  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent bg="white" borderRadius="xl" overflow="hidden">
        {/* Header with card id, rarity, and type */}
        <ModalHeader bg="black" color="white" textAlign="center" py={3}>
          <VStack spacing={1}>
            <HStack spacing={4} justify="center" align="center">
              <Text fontSize="sm" fontWeight="bold" letterSpacing="wider">
                {selectedCard.card_code} | {selectedCard.rarity} | {selectedCard.category}
              </Text>
              <CardVariantIndicator cardId={selectedCard.id} />
            </HStack>
            <Text fontSize="xl" fontWeight="bold" letterSpacing="wide">
              {selectedCard.name}
            </Text>
          </VStack>
        </ModalHeader>

        <ModalCloseButton color="white" size="lg" />

        <ModalBody p={0}>
          <Grid templateColumns={{ base: "1fr", md: "350px 1fr" }} gap={0} minH="400px">
            {/* Left side - Card Image */}
            <GridItem display="flex" alignItems="center" justifyContent="center" p={4}>
              <Box maxW="320px" maxH="450px">
                <CardImage
                  width="100%"
                  height="auto"
                  src={selectedCard.img_url}
                  alt={selectedCard.name}
                  fallbackSrc="/placeholder.png"
                />
              </Box>
            </GridItem>

            {/* Right side - Card Details */}
            <GridItem p={4}>
              <VStack align="stretch" spacing={4} h="100%">
                {/* Stats Table */}
                <Table variant="simple" size="sm">
                  <Tbody>
                    {(selectedCard.cost !== null && selectedCard.cost !== undefined && selectedCard.cost !== '-') && (
                      <Tr>
                        <Td fontWeight="bold" w="100px" p={2} fontSize="sm">
                          {selectedCard.category === 'LEADER' ? 'Life' : 'Cost'}
                        </Td>
                        <Td p={2} fontSize="md">{selectedCard.cost}</Td>
                        <Td fontWeight="bold" w="100px" p={2} fontSize="sm">Attribute</Td>
                        <Td p={2} fontSize="md">
                          {selectedCard.attributes || selectedCard.color || '-'}
                        </Td>
                      </Tr>
                    )}
                    {(selectedCard.power || selectedCard.counter) && (
                      <Tr>
                        {selectedCard.power && (
                          <>
                            <Td fontWeight="bold" p={2} fontSize="sm">Power</Td>
                            <Td p={2} fontSize="md">{selectedCard.power.toLocaleString()}</Td>
                          </>
                        )}
                        {selectedCard.counter && (
                          <>
                            <Td fontWeight="bold" p={2} fontSize="sm">Counter</Td>
                            <Td p={2} fontSize="md">+{selectedCard.counter}</Td>
                          </>
                        )}
                      </Tr>
                    )}
                    {(selectedCard.color || selectedCard.block) && (
                      <Tr>
                        {selectedCard.color && (
                          <>
                            <Td fontWeight="bold" p={2} fontSize="sm">Color</Td>
                            <Td p={2} fontSize="md">
                              <Tag {...getTagStyles(selectedCard.color)} size="md">
                                {selectedCard.color}
                              </Tag>
                            </Td>
                          </>
                        )}
                        {(selectedCard.block && selectedCard.block !== '-') && (
                          <>
                            <Td fontWeight="bold" p={2} fontSize="sm">Block icon</Td>
                            <Td p={2} fontSize="md">{selectedCard.block}</Td>
                          </>
                        )}
                      </Tr>
                    )}
                  </Tbody>
                </Table>

                {/* Types */}
                {selectedCard.types && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>Types</Text>
                    <Text fontSize="sm">
                      {Array.isArray(selectedCard.types) ?
                        selectedCard.types.join(', ') :
                        selectedCard.types.toString().replace(/[,\s]+/g, ', ')
                      }
                    </Text>
                  </Box>
                )}

                {/* Effect */}
                {selectedCard.effect && selectedCard.effect.trim() !== '' && selectedCard.effect.trim() !== '-' && (
                  <Box flex={1}>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>Effect</Text>
                    <Box
                      bg="white"
                      p={3}
                      borderRadius="md"
                      minH="60px"
                      fontSize="sm"
                    >
                      <StyledTextRenderer text={selectedCard.effect} />
                    </Box>
                  </Box>
                )}

                {/* Trigger Effect */}
                {selectedCard.trigger_effect && selectedCard.trigger_effect.trim() !== '' && selectedCard.trigger_effect.trim() !== '-' && (
                  <Box>
                    <Box
                      bg="black"
                      color="white"
                      p={3}
                      borderRadius="md"
                      minH="50px"
                      fontSize="sm"
                    >
                      <StyledTextRenderer text={selectedCard.trigger_effect} />
                    </Box>
                  </Box>
                )}
                {/* Appears In */}
                {selectedCard.packs && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>Set(s)</Text>
                    <Wrap>
                      {selectedCard.packs.split(', ').map(pack => (
                        <WrapItem key={pack}>
                          <Tag size="sm">{pack}</Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
              </VStack>
            </GridItem>
          </Grid>
        </ModalBody>

        <ModalFooter py={3}>
          <HStack spacing={4} width="100%" justify="space-between">
            {/* Count Controls */}
            <HStack spacing={6}>
              <Box textAlign="center">
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                  Owned Cards
                </Text>
                <CountControl
                  cardId={selectedCard.id}
                  type="owned"
                  count={selectedCard.owned_count || 0}
                  onUpdate={onCountUpdate}
                />
              </Box>

              {showProxies && (
                <Box textAlign="center">
                  <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                    Proxy Cards
                  </Text>
                  <CountControl
                    cardId={selectedCard.id}
                    type="proxy"
                    count={selectedCard.proxy_count || 0}
                    onUpdate={onCountUpdate}
                  />
                </Box>
              )}
              {/* Location Selection - Only show if user owns cards */}
              {selectedCard.owned_count > 0 && (
                <Box>
                  <FormControl>
                    <HStack spacing={2} mb={2}>
                      <FiMapPin />
                      <FormLabel fontSize="sm" fontWeight="bold" mb={0}>Location</FormLabel>
                    </HStack>
                    <Select
                      value={selectedCard.location?.id || ''}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      isDisabled={isUpdatingLocation}
                      placeholder="No location assigned"
                      size="sm"
                    >
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.type})
                        </option>
                      ))}
                    </Select>
                    {selectedCard.location && (
                      <HStack mt={1} spacing={2}>
                        <Tag
                          colorScheme={selectedCard.location.marker}
                          size="sm"
                          textTransform="capitalize"
                        >
                          {selectedCard.location.marker}
                        </Tag>
                        <Text fontSize="xs" color="gray.600">
                          {selectedCard.location.type}
                        </Text>
                      </HStack>
                    )}
                  </FormControl>
                </Box>
              )}

            </HStack>

            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CardDetailModal;
