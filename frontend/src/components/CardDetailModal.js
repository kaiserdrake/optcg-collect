import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Tag, Stat, StatLabel, StatNumber, Wrap, WrapItem, Image,
  Flex, Heading, StackDivider, Button
} from '@chakra-ui/react';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';

// Helper functions (moved from CardSearch)
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

const keywordStyles = {
  'trigger': { bg: 'yellow.400', color: 'black', variant: 'solid', px: '3', borderRadius: 0, sx: { clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 0% 100%)' } },
  'on play': { colorScheme: 'blue', variant: 'solid' },
  'activate: main': { colorScheme: 'blue', variant: 'solid' },
  'your turn': { colorScheme: 'blue', variant: 'solid' },
  'end of your turn': { colorScheme: 'blue', variant: 'solid' },
  'main': { colorScheme: 'blue', variant: 'solid' },
  'when attacking': { colorScheme: 'blue', variant: 'solid' },
  'when blocking': { colorScheme: 'blue', variant: 'solid' },
  'on k.o.': { colorScheme: 'blue', variant: 'solid' },
  "opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  "end of your opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  'counter': { colorScheme: 'red', variant: 'solid' },
  'once per turn': { colorScheme: 'pink', variant: 'solid', borderRadius: 'full' },
  'blocker': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'rush': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'double attack': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'banish': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
};

const keywordPatterns = [
  { regex: /DON!! [x-]\d+/i, style: { bg: 'black', color: 'white', variant: 'solid' } }
];

const StyledTextRenderer = ({ text }) => {
  if (!text || text.trim() === '' || text.trim() === '-') {
    return <Text as="span">&nbsp;</Text>;
  }

  const parts = text.split(/(\[.*?\])/g);

  return (
    <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
      {parts.map((part, index) => {
        if (part.match(/^\[.*\]$/)) {
          const keyword = part.slice(1, -1).toLowerCase();
          const style = keywordStyles[keyword];
          if (style) {
            return (
              <Tag
                key={index}
                {...style}
                display="inline-flex"
                flexShrink={0}
                whiteSpace="nowrap"
              >
                {part.slice(1, -1)}
              </Tag>
            );
          }
          const patternMatch = keywordPatterns.find(p => p.regex.test(part.slice(1, -1)));
          if (patternMatch) {
            return (
              <Tag
                key={index}
                {...patternMatch.style}
                display="inline-flex"
                flexShrink={0}
                whiteSpace="nowrap"
              >
                {part.slice(1, -1)}
              </Tag>
            );
          }
        }
        // Only render non-empty text parts
        if (part.trim()) {
          return (
            <Text
              key={index}
              as="span"
              display="inline"
              whiteSpace="pre-wrap"
            >
              {part}
            </Text>
          );
        }
        return null;
      })}
    </Box>
  );
};

const CardDetailModal = ({
  isOpen,
  onClose,
  selectedCard,
  showProxies,
  onCountUpdate
}) => {
  if (!selectedCard) return null;

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
            <Box flexShrink={0}>
              <Image
                borderRadius="lg"
                width={{ base: '100%', md: '250px' }}
                src={selectedCard.img_url}
                alt={selectedCard.name}
                fallbackSrc='https://via.placeholder.com/250x350?text=No+Image'
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
              </Wrap>
              <HStack spacing={6} divider={<StackDivider />} pt={1}>
                {selectedCard.cost !== null && (
                  <Stat>
                    <StatLabel>Cost</StatLabel>
                    <StatNumber>{selectedCard.cost}</StatNumber>
                  </Stat>
                )}
                {selectedCard.power !== null && (
                  <Stat>
                    <StatLabel>Power</StatLabel>
                    <StatNumber>{selectedCard.power}</StatNumber>
                  </Stat>
                )}
                {selectedCard.counter !== null && (
                  <Stat>
                    <StatLabel>Counter</StatLabel>
                    <StatNumber>{selectedCard.counter}</StatNumber>
                  </Stat>
                )}
              </HStack>
              <VStack spacing={4} align="stretch" pt={2}>
                <StyledTextRenderer text={selectedCard.effect} />
                <StyledTextRenderer text={selectedCard.trigger_effect} />
              </VStack>
              <Box pt={2}>
                <Heading size="sm" mb={1}>Appears In</Heading>
                <Wrap>
                  {selectedCard.packs?.split(', ').map(pack => (
                    <WrapItem key={pack}>
                      <Tag size="sm">{pack}</Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
              <HStack justify="flex-start" pt={3} borderTopWidth="1px" borderColor="gray.200" spacing={10}>
                <VStack spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color="gray.500">Owned</Text>
                  <CountControl
                    cardId={selectedCard.id}
                    type="owned"
                    count={selectedCard.owned_count}
                    onUpdate={onCountUpdate}
                  />
                </VStack>
                {showProxies && (
                  <VStack spacing={0}>
                    <Text fontSize="sm" fontWeight="bold" color="gray.500">Proxy</Text>
                    <CountControl
                      cardId={selectedCard.id}
                      type="proxy"
                      count={selectedCard.proxy_count}
                      onUpdate={onCountUpdate}
                    />
                  </VStack>
                )}
              </HStack>
            </VStack>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CardDetailModal;
