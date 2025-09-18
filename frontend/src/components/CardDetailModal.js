import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Tag, Grid, GridItem, Wrap, WrapItem,
  Flex, Heading, Button, Table, Tbody, Tr, Td,
  useToast, useDisclosure
} from '@chakra-ui/react';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';
import LocationDisplayBadge from './LocationDisplayBadge';


import SetLocationModal from './SetLocationModal';
import LocationManagementModal from './LocationManagementModal';
import CardTags from './CardTags';
import { getTagStyles } from '@/utils/cardStyles';
import { dispatchCardUpdate, CARD_EVENTS } from '@/utils/cardEvents';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CardDetailModal = ({
  isOpen,
  onClose,
  selectedCard,
  showProxies,
  onCountUpdate,
  interactive = true
}) => {
  const [cardData, setCardData] = useState(selectedCard);
  const [locationModalCard, setLocationModalCard] = useState(null);

  const [isManageLocationsOpen, setIsManageLocationsOpen] = useState(false);

  const { isOpen: isLocationModalOpen, onOpen: onLocationModalOpen, onClose: onLocationModalClose } = useDisclosure();
  const toast = useToast();

  // Function to fetch complete card data including collection information
  const fetchCompleteCardData = async (card) => {
    if (!card?.id) return card;

    try {
      const searchParams = new URLSearchParams({
        keyword: `id:${card.id}`,
        ownedOnly: 'false',
        showProxies: 'true'
      });

      const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const searchResults = await response.json();
        if (searchResults.length > 0) {
          return searchResults[0]; // Return the complete card data with collection info
        }
      }
    } catch (error) {
      console.warn('Failed to fetch complete card data:', error);
    }

    return card; // Return original card if fetch fails
  };

  // Update cardData when selectedCard changes or modal opens
  useEffect(() => {
    if (selectedCard && isOpen) {
      // Always fetch complete card data when modal opens
      fetchCompleteCardData(selectedCard).then(completeCard => {
        setCardData(completeCard);
      });
    } else if (selectedCard) {
      // If modal is not open, just set the basic card data
      setCardData(selectedCard);
    }
  }, [selectedCard, isOpen]);

  // Handle location modal opening
  const handleLocationBadgeClick = (card) => {
    if (!interactive) return; // Prevent opening in non-interactive mode
    setLocationModalCard(card);
    onLocationModalOpen();
  };

  // Handle location modal closing
  const handleLocationModalClose = () => {
    setLocationModalCard(null);
    onLocationModalClose();
  };

  // Handle location update callback
  const handleLocationUpdate = async () => {
    if (!cardData?.id) return;

    try {
      // DON'T use ownedOnly: 'true' - this prevents cards not in collection from being found
      // Use ownedOnly: 'false' to ensure all cards (including those with 0 counts) are returned
      const searchParams = new URLSearchParams({
        keyword: `id:${cardData.id}`,
        ownedOnly: 'false',  // Changed from 'true' to 'false'
        showProxies: 'true'
      });

      const res = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',

      });

      if (res.ok) {
        const searchResults = await res.json();
        if (searchResults.length > 0) {
          const updatedCard = searchResults[0];
          setCardData(updatedCard);

          // Call the parent's onCountUpdate with the special 'location_updated' string (backward compatibility)
          if (onCountUpdate) {
            onCountUpdate(updatedCard.id, 'location_updated');
          }

          // Dispatch global event for all components (including LocateModal)
          dispatchCardUpdate(CARD_EVENTS.LOCATION_UPDATED, updatedCard.id, { card: updatedCard });
        }
      }
    } catch (error) {
      console.warn('Failed to refresh card data after location change:', error);
    }

    // Keep existing custom event for backward compatibility
    const event = new CustomEvent('locationChanged', {
      detail: { action: 'update', locationData: cardData }
    });
    window.dispatchEvent(event);
  };

  // Handle location management changes
  const handleLocationChange = async (action, locationData) => {
    if (!cardData?.id) return;

    try {
      // Refresh card data after location change
      const searchParams = new URLSearchParams({
        keyword: `id:${cardData.id}`,
        ownedOnly: 'false',  // Changed from 'true' to 'false'
        showProxies: 'true'
      });

      const res = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const searchResults = await res.json();
        if (searchResults.length > 0) {
          const updatedCard = searchResults[0];
          setCardData(updatedCard);

          // Call the parent's onCountUpdate with the special 'location_updated' string
          // This will trigger the parent to refresh the card in the search results
          if (onCountUpdate) {
            onCountUpdate(updatedCard.id, 'location_updated');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh card data after location change:', error);
    }
    // This ensures all cards with the same location are refreshed in the ListCard view
    const event = new CustomEvent('locationChanged', {
      detail: { action, locationData }
    });
    window.dispatchEvent(event);
  };

  // Handle tag update callback
  const handleTagUpdate = async () => {
    if (!cardData?.id) return;

    try {
      // DON'T use ownedOnly: 'true' - this prevents cards not in collection from being found
      // Use ownedOnly: 'false' to ensure all cards (including those with 0 counts) are returned
      const searchParams = new URLSearchParams({
        keyword: `id:${cardData.id}`,
        ownedOnly: 'false',  // Changed from 'true' to 'false'
        showProxies: 'true'
      });

      const res = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const searchResults = await res.json();
        if (searchResults.length > 0) {
          const updatedCard = searchResults[0];
          setCardData(updatedCard);

          // Call the parent's onCountUpdate with the special 'tag_updated' string (backward compatibility)
          if (onCountUpdate) {
            onCountUpdate(updatedCard.id, 'tag_updated');
          }

          // Dispatch global event for all CardSearch instances
          dispatchCardUpdate(CARD_EVENTS.TAG_UPDATED, updatedCard.id, { card: updatedCard });
        }
      }
    } catch (error) {
      console.warn('Failed to refresh card data after tag update:', error);
    }
  };

  const handleCountControlUpdate = (cardId, newData) => {
    if (!cardId) return;
    if (typeof newData === 'object' && (newData.owned_count !== undefined || newData.proxy_count !== undefined)) {
      setCardData(prev => ({
        ...prev,
        ...newData,
      }));

      dispatchCardUpdate(CARD_EVENTS.COUNT_UPDATED, cardId, { card: { ...cardData, ...newData } });
    }
    if (onCountUpdate) {
      onCountUpdate(cardId, newData);
    }
  };

  if (!cardData) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent bg="white" borderRadius="xl" overflow="hidden">
          {/* Header with card id, rarity, and type */}
          <ModalHeader bg="black" color="white" textAlign="center" py={3}>
            <VStack spacing={1}>
              <HStack spacing={4} justify="center" align="center">
                <Text fontSize="sm" fontWeight="bold" letterSpacing="wider">
                  {cardData.card_code} | {cardData.rarity} | {cardData.category}

                </Text>
                <CardVariantIndicator cardId={cardData.id} />
              </HStack>
              <Text fontSize="xl" fontWeight="bold" letterSpacing="wide">

                {cardData.name}
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
                    src={cardData.img_url}
                    alt={cardData.name}
                    fallbackSrc="/placeholder.png"
                  />
                </Box>
              </GridItem>

              {/* Right side - Card Details */}
              <GridItem p={4}>
                <VStack align="stretch" spacing={4} h="100%">
                  {/* Effect Text - Only show if effect exists and is not empty or "-" */}
                  {cardData.effect && cardData.effect.trim() !== '' && cardData.effect.trim() !== '-' && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Effect</Heading>
                      <Box
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderLeftColor="black.400"
                      >
                        <StyledTextRenderer text={cardData.effect} fontSize="sm" />
                      </Box>
                    </Box>
                  )}

                  {/* Trigger Effect */}
                  {cardData.trigger_effect && cardData.trigger_effect.trim() !== '' && cardData.trigger_effect.trim() !== '-' && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Trigger</Heading>

                      <Box
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderLeftColor="orange.400"
                      >
                        <StyledTextRenderer text={cardData.trigger_effect} fontSize="sm" />
                      </Box>
                    </Box>
                  )}

                  {/* Block Number, Attributes, and Types */}
                  {((cardData.block !== null && cardData.block !== undefined) ||
                    (cardData.attributes && Array.isArray(cardData.attributes) && cardData.attributes.length > 0) ||
                    (cardData.types && Array.isArray(cardData.types) && cardData.types.length > 0)) && (
                    <Table variant="simple" size="sm">
                      <Tbody>
                        <Tr>
                          <Td fontWeight="bold" fontSize="sm" p={2} borderBottom="none">Block</Td>
                          <Td fontSize="sm" p={2} borderBottom="none">
                            {(cardData.block !== null && cardData.block !== undefined) ? cardData.block : '-'}
                          </Td>
                          <Td fontWeight="bold" fontSize="sm" p={2} borderBottom="none">Attributes</Td>
                          <Td fontSize="sm" p={2} borderBottom="none">
                            {cardData.attributes && Array.isArray(cardData.attributes) && cardData.attributes.length > 0 ? (
                              <Wrap spacing={1}>
                                {cardData.attributes.map((attr, index) => (
                                  <WrapItem key={index}>
                                    <Tag size="sm" colorScheme="gray" variant="outline">
                                      {attr}
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            ) : '-'}
                          </Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="bold" fontSize="sm" p={2} borderBottom="none">Types</Td>
                          <Td fontSize="sm" p={2} borderBottom="none" colSpan={3}>
                            {cardData.types && Array.isArray(cardData.types) && cardData.types.length > 0 ? (
                              <Wrap spacing={1}>
                                {cardData.types.map((type, index) => (
                                  <WrapItem key={index}>
                                    <Tag size="sm" colorScheme="blue" variant="outline">
                                      {type}
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            ) : '-'}
                          </Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  )}

                  {/* Pack Appearance */}
                  {cardData.packs && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Available In</Heading>
                      <Wrap spacing={2}>
                        {cardData.packs.split(', ').map(pack => (
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

          {/* Conditionally render footer based on interactive prop */}
          {interactive && (
            <ModalFooter py={3}>
              <HStack spacing={4} width="100%" justify="space-between">
                {/* Count Controls */}
                <HStack spacing={6}>
                  <Box textAlign="center">
                    <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                      Owned Cards
                    </Text>
                    <CountControl
                      cardId={cardData.id}
                      type="owned"
                      count={cardData.owned_count || 0}
                      onUpdate={handleCountControlUpdate}
                    />
                  </Box>

                  {showProxies && (
                    <Box textAlign="center">
                      <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                        Proxy Cards
                      </Text>
                      <CountControl
                        cardId={cardData.id}
                        type="proxy"
                        count={cardData.proxy_count || 0}
                        onUpdate={handleCountControlUpdate}
                      />
                    </Box>
                  )}

                  {/* Location Badge - using the same components as ListCard */}
                  {((cardData.owned_count > 0) || (cardData.proxy_count > 0)) && (
                    <Box textAlign="center">
                      <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                        Location
                      </Text>
                      <LocationDisplayBadge
                        card={cardData}
                        onClick={handleLocationBadgeClick}
                      />
                    </Box>
                  )}

                  {/* Card Tags - Add near the Location badge */}
                  <Box textAlign="center">
                    <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                      Tags
                    </Text>
                    <CardTags cardId={cardData.id} card={cardData} interactive={true} onTagUpdate={handleTagUpdate} />
                  </Box>
                </HStack>

                <Button colorScheme="blue" onClick={onClose}>
                  Close
                </Button>
              </HStack>
            </ModalFooter>
          )}

          {/* Non-interactive footer - just the close button */}
          {!interactive && (
            <ModalFooter py={3}>
              <Button colorScheme="blue" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      {/* SetLocationModal - only render if interactive */}
      {interactive && (
        <SetLocationModal
          isOpen={isLocationModalOpen}
          onClose={handleLocationModalClose}
          card={locationModalCard}
          onLocationSet={handleLocationUpdate}
          onManageLocations={() => {
            handleLocationModalClose();
            setIsManageLocationsOpen(true);
          }}
        />
      )}

      {/* LocationManagementModal for CardDetailModal - only render if interactive */}
      {interactive && (
        <LocationManagementModal
          isOpen={isManageLocationsOpen}
          onClose={() => setIsManageLocationsOpen(false)}
          onLocationChange={handleLocationChange}
          scrollBehavior="inside"
        />
      )}
    </>
  );
};

export default CardDetailModal;
