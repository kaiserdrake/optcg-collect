import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Tag, Stat, StatLabel, StatNumber, Wrap, WrapItem,
  Flex, Heading, StackDivider, Button
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
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{selectedCard.name}</Text>
            <CardVariantIndicator cardId={selectedCard.id} />
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
            {/* FIXED: Use CardImage instead of standard Image */}
            <Box flexShrink={0}>
              <CardImage
                borderRadius="lg"
                width={{ base: '100%', md: '250px' }}
                height={{ base: '350px', md: '350px' }}
                src={selectedCard.img_url}
                alt={selectedCard.name}
                fallbackSrc="/placeholder.png"
              />
            </Box>

            <VStack align="stretch" spacing={3} flex={1}>
              <Wrap spacing={2}>
                <WrapItem>
                  <Tag size="lg" {...getTagStyles(selectedCard.color)}>
                    {selectedCard.card_code}
                  </Tag>
                </WrapItem>
                <WrapItem>
                  <Tag size="lg" colorScheme="gray">
                    {selectedCard.category}
                  </Tag>
                </WrapItem>
                <WrapItem>
                  <Tag size="lg" colorScheme="gray">
                    {selectedCard.rarity}
                  </Tag>
                </WrapItem>
                {selectedCard.cost !== null && (
                  <WrapItem>
                    <Tag size="lg" colorScheme="orange">
                      {getCostLabel(selectedCard)}: {selectedCard.cost}
                    </Tag>
                  </WrapItem>
                )}
                {selectedCard.power && (
                  <WrapItem>
                    <Tag size="lg" colorScheme="red">
                      Power: {selectedCard.power.toLocaleString()}
                    </Tag>
                  </WrapItem>
                )}
                {selectedCard.counter && (
                  <WrapItem>
                    <Tag size="lg" colorScheme="yellow">
                      Counter: +{selectedCard.counter}
                    </Tag>
                  </WrapItem>
                )}
                {selectedCard.block && (
                  <WrapItem>
                    <Tag size="lg" colorScheme="cyan">
                      Block: +{selectedCard.block}
                    </Tag>
                  </WrapItem>
                )}
              </Wrap>

              <VStack align="stretch" spacing={4} divider={<StackDivider />}>
                {selectedCard.effect && selectedCard.effect.trim() !== '' && selectedCard.effect.trim() !== '-' && (
                  <Box>
                    <Heading size="sm" mb={2}>Effect</Heading>
                    <StyledTextRenderer text={selectedCard.effect} />
                  </Box>
                )}

                {selectedCard.trigger_effect && selectedCard.trigger_effect.trim() !== '' && selectedCard.trigger_effect.trim() !== '-' && (
                  <Box>
                    <Heading size="sm" mb={2}>Trigger Effect</Heading>
                    <StyledTextRenderer text={selectedCard.trigger_effect} />
                  </Box>
                )}

                {selectedCard.attributes && selectedCard.attributes.length > 0 && (
                  <Box>
                    <Heading size="sm" mb={2}>Attributes</Heading>
                    <Wrap>
                      {selectedCard.attributes.map((attr, index) => (
                        <WrapItem key={index}>
                          <Tag colorScheme="teal">{attr}</Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {selectedCard.types && selectedCard.types.length > 0 && (
                  <Box>
                    <Heading size="sm" mb={2}>Types</Heading>
                    <Wrap>
                      {selectedCard.types.map((type, index) => (
                        <WrapItem key={index}>
                          <Tag colorScheme="purple">{type}</Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {selectedCard.packs && (
                  <Box>
                    <Heading size="sm" mb={2}>Appears In</Heading>
                    <Wrap>
                      {selectedCard.packs.split(', ').map(pack => (
                        <WrapItem key={pack}>
                          <Tag size="sm">{pack}</Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                <HStack spacing={4}>
                  {selectedCard.owned_count !== undefined && (
                    <Stat>
                      <StatLabel>Owned</StatLabel>
                      <StatNumber>{selectedCard.owned_count}</StatNumber>
                    </Stat>
                  )}
                  {showProxies && selectedCard.proxy_count !== undefined && (
                    <Stat>
                      <StatLabel>Proxies</StatLabel>
                      <StatNumber>{selectedCard.proxy_count}</StatNumber>
                    </Stat>
                  )}
                </HStack>
              </VStack>
            </VStack>
          </Flex>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4} width="100%" justify="space-between">
            {/* Count Controls */}
            <HStack spacing={8}>
              <Box textAlign="center">
                <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={2}>
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
                  <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={2}>
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
