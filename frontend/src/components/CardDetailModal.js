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
import { getTagStyles } from '@/utils/cardStyles';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CardDetailModal = ({
  isOpen,
  onClose,
  selectedCard,
  showProxies,
  onCountUpdate
}) => {
  const [cardData, setCardData] = useState(selectedCard);
  const [locationModalCard, setLocationModalCard] = useState(null);
  const { isOpen: isLocationModalOpen, onOpen: onLocationModalOpen, onClose: onLocationModalClose } = useDisclosure();
  const toast = useToast();

  // Update cardData when selectedCard changes
  useEffect(() => {
    setCardData(selectedCard);
  }, [selectedCard]);

  // Handle location modal opening
  const handleLocationBadgeClick = (card) => {
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
      // Use the search endpoint to fetch updated card data (same approach as CardSearch)
      const res = await fetch(`${api}/api/cards/search?keyword=id:${cardData.id}&ownedOnly=true`, {
        credentials: 'include',
      });
      if (res.ok) {
        const searchResults = await res.json();
        if (searchResults.length > 0) {
          const updatedCard = searchResults[0];
          setCardData(updatedCard);

          // Call the parent's onCountUpdate with the special 'location_updated' string
          // This matches how CardSearch handles location updates
          if (onCountUpdate) {
            onCountUpdate(updatedCard.id, 'location_updated');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh card data:', error);
    }
  };

  if (!cardData) return null;

  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay bg="blackAlpha.600" />
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
                  {/* Stats Table */}
                  <Table variant="simple" size="sm">
                    <Tbody>
                      {(cardData.cost !== null && cardData.cost !== undefined && cardData.cost !== '-') && (
                        <Tr>
                          <Td fontWeight="bold" w="100px" p={2} fontSize="sm">
                            {cardData.category === 'LEADER' ? 'Life' : 'Cost'}
                          </Td>
                          <Td p={2} fontSize="sm">{cardData.cost}</Td>
                        </Tr>
                      )}
                      {cardData.power && (
                        <Tr>
                          <Td fontWeight="bold" p={2} fontSize="sm">Power</Td>
                          <Td p={2} fontSize="sm">{cardData.power.toLocaleString()}</Td>
                        </Tr>
                      )}
                      {cardData.counter && (
                        <Tr>
                          <Td fontWeight="bold" p={2} fontSize="sm">Counter</Td>
                          <Td p={2} fontSize="sm">+{cardData.counter}</Td>
                        </Tr>
                      )}
                      {cardData.color && (
                        <Tr>
                          <Td fontWeight="bold" p={2} fontSize="sm">Color</Td>
                          <Td p={2} fontSize="sm">
                            <Tag size="sm" {...getTagStyles(cardData.color)}>
                              {cardData.color}
                            </Tag>
                          </Td>
                        </Tr>
                      )}
                      {cardData.type && (
                        <Tr>
                          <Td fontWeight="bold" p={2} fontSize="sm">Type</Td>
                          <Td p={2} fontSize="sm">{cardData.type}</Td>
                        </Tr>
                      )}
                      {cardData.attribute && (
                        <Tr>
                          <Td fontWeight="bold" p={2} fontSize="sm">Attribute</Td>
                          <Td p={2} fontSize="sm">{cardData.attribute}</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>

                  {/* Effect Text */}
                  {cardData.effect && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Effect</Heading>
                      <Box
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderLeftColor="blue.400"
                      >
                        <StyledTextRenderer text={cardData.effect} fontSize="sm" />
                      </Box>
                    </Box>
                  )}

                  {/* Trigger Effect */}
                  {cardData.trigger_effect && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Trigger</Heading>
                      <Box
                        p={3}
                        bg="red.50"
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderLeftColor="red.400"
                      >
                        <StyledTextRenderer text={cardData.trigger_effect} fontSize="sm" />
                      </Box>
                    </Box>
                  )}

                  {/* Packs */}
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
                    onUpdate={onCountUpdate}
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
                      onUpdate={onCountUpdate}
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
              </HStack>

              <Button colorScheme="blue" onClick={onClose}>
                Close
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* SetLocationModal - same as used in CardSearch */}
      <SetLocationModal
        isOpen={isLocationModalOpen}
        onClose={handleLocationModalClose}
        card={locationModalCard}
        onLocationSet={handleLocationUpdate}
        onManageLocations={() => {
          handleLocationModalClose();
          // You might want to add a callback here to open LocationManagementModal
          // if the parent component supports it
        }}
      />
    </>
  );
};

export default CardDetailModal;
