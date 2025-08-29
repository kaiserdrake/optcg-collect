import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Tag, Grid, GridItem, Wrap, WrapItem,
  Flex, Heading, Button, Table, Tbody, Tr, Td
} from '@chakra-ui/react';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import StyledTextRenderer from './StyledTextRenderer';
import CardImage from './CardImage';

// Helper functions
const colorMap = {
  Red: '#E53E3E',
  Green: '#48BB78',
  Blue: '#4299E1',
  Purple: '#9F7AEA',
  Black: '#1A202C',
  Yellow: '#D69E2E',
};

const getTagStyles = (colorString) => {
  if (!colorString) return { variant: 'subtle' };
  const colors = colorString.split('/').map(c => colorMap[c.trim()]).filter(Boolean);
  if (colors.length === 0) return { variant: 'subtle' };
  if (colors.length === 1) {
    return { bg: colors[0], color: 'white', variant: 'solid' };
  }
  const gradient = `linear(to-r, ${colors.join(', ')})`;
  return { bgGradient: gradient, color: 'white', variant: 'solid' };
};

const CardDetailModal = ({
  isOpen,
  onClose,
  selectedCard,
  showProxies,
  onCountUpdate
}) => {
  if (!selectedCard) return null;

  const getCostLabel = (card) => {
    return card.category === 'LEADER' ? 'Life' : 'Cost';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent bg="white" borderRadius="xl" overflow="hidden">
        {/* Header with card id, rarity, and type */}
        <ModalHeader bg="black" color="white" textAlign="center" py={3}>
          <VStack spacing={1}>
            <HStack spacing={4} justify="center" align="center">
              <Text fontSize="md" fontWeight="bold" letterSpacing="wider">
                {selectedCard.id} | {selectedCard.rarity} | {selectedCard.category}
              </Text>
              <CardVariantIndicator cardId={selectedCard.id} />
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" letterSpacing="wide">
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
                        <Td fontWeight="bold" w="100px" p={2}>Cost</Td>
                        <Td p={2} fontSize="lg">{selectedCard.cost}</Td>
                        <Td fontWeight="bold" w="100px" p={2}>Attribute</Td>
                        <Td p={2} fontSize="lg">
                          {selectedCard.attributes || selectedCard.color || '-'}
                        </Td>
                      </Tr>
                    )}
                    {(selectedCard.power || selectedCard.counter) && (
                      <Tr>
                        {selectedCard.power && (
                          <>
                            <Td fontWeight="bold" p={2}>Power</Td>
                            <Td p={2} fontSize="lg">{selectedCard.power.toLocaleString()}</Td>
                          </>
                        )}
                        {selectedCard.counter && (
                          <>
                            <Td fontWeight="bold" p={2}>Counter</Td>
                            <Td p={2} fontSize="lg">+{selectedCard.counter}</Td>
                          </>
                        )}
                      </Tr>
                    )}
                    {(selectedCard.color || selectedCard.block) && (
                      <Tr>
                        {selectedCard.color && (
                          <>
                            <Td fontWeight="bold" p={2}>Color</Td>
                            <Td p={2} fontSize="lg">
                              <Tag {...getTagStyles(selectedCard.color)} size="md">
                                {selectedCard.color}
                              </Tag>
                            </Td>
                          </>
                        )}
                        {(selectedCard.block && selectedCard.block !== '-') && (
                          <>
                            <Td fontWeight="bold" p={2}>Block icon</Td>
                            <Td p={2} fontSize="lg">{selectedCard.block}</Td>
                          </>
                        )}
                      </Tr>
                    )}
                  </Tbody>
                </Table>

                {/* Types */}
                {selectedCard.types && (
                  <Box>
                    <Text fontWeight="bold" fontSize="md" mb={1}>Types</Text>
                    <Text fontSize="md">
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
                    <Text fontWeight="bold" fontSize="md" mb={1}>Effect</Text>
                    <Box
                      bg="white"
                      p={3}
                      borderRadius="md"
                      minH="60px"
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
                    >
                      <StyledTextRenderer text={selectedCard.trigger_effect} />
                    </Box>
                  </Box>
                )}

                {/* Appears In */}
                {selectedCard.packs && (
                  <Box>
                    <Text fontWeight="bold" fontSize="md" mb={1}>Set/s</Text>
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
