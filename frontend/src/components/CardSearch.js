'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Text, VStack, HStack, Tag, Spinner, Stat, StatLabel, StatNumber, Wrap, WrapItem, Image,
  Flex, Heading, StackDivider, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, Button, IconButton, Code, FormControl, FormLabel, Switch,
  Grid, GridItem
} from '@chakra-ui/react';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import AdvancedSearchInput from './AdvancedSearchInput';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';

const colorMap = {
  Red: '#E53E3E',
  Green: '#48BB78',
  Blue: '#4299E1',
  Purple: '#9F7AEA',
  Black: '#1A202C',
  Yellow: '#D69E2E',
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
        <Text as="span" fontSize="sm" whiteSpace="pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    const keyword = part.slice(1, -1);
                    const keywordLower = keyword.toLowerCase();
                    const exactStyle = keywordStyles[keywordLower];
                    if (exactStyle) {
                        const { sx, ...chakraProps } = exactStyle;
                        return <Tag key={index} size="sm" mx="1" sx={sx} {...chakraProps} verticalAlign="baseline">{keyword}</Tag>;
                    }
                    for (const pattern of keywordPatterns) {
                        if (pattern.regex.test(keyword)) {
                            const { sx, ...chakraProps } = pattern.style;
                            return <Tag key={index} size="sm" mx="1" sx={sx} {...chakraProps} verticalAlign="baseline">{keyword}</Tag>;
                        }
                    }
                    return <Text as="span" key={index} fontWeight="bold">{keyword}</Text>;
                }
                return part.split(/<br\s*\/?>/gi).map((line, lineIndex, arr) => (
                    <React.Fragment key={`${index}-${lineIndex}`}>
                        {line}
                        {lineIndex < arr.length - 1 && <br />}
                    </React.Fragment>
                ));
            })}
        </Text>
    );
};

const extractStyledKeywords = (effectText, triggerText) => {
    const combinedText = `${effectText || ''} ${triggerText || ''}`;
    const keywordSet = new Set();
    const regex = /\[(.*?)\]/g;
    let match;
    while ((match = regex.exec(combinedText)) !== null) {
        const keyword = match[1];
        const keywordLower = keyword.toLowerCase();
        const isExactMatch = !!keywordStyles[keywordLower];
        const isPatternMatch = keywordPatterns.some(p => p.regex.test(keyword));
        if (isExactMatch || isPatternMatch) {
            keywordSet.add(keyword);
        }
    }
    return Array.from(keywordSet);
};

export default function CardSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProxies, setShowProxies] = useState(false);
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleCardClick = (card) => {
    setSelectedCard(card);
    onDetailOpen();
  };

  const handleCountUpdate = (cardId, newCounts) => {
    setResults(currentResults =>
      currentResults.map(card =>
        card.id === cardId ? { ...card, ...newCounts } : card
      )
    );
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(currentCard => ({ ...currentCard, ...newCounts }));
    }
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

  useEffect(() => {
    if (searchTerm.length < 3) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams({
          keyword: searchTerm,
          ownedOnly: showOnlyOwned,
          showProxies: showProxies,
      });
      fetch(`${apiUrl}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include'
      })
      .then((res) => {
        if (!res.ok) { return res.json().then(errData => Promise.reject(errData)); }
        return res.json();
      })
      .then((data) => { setResults(data); })
      .catch((error) => {
        console.error("Failed to fetch search results:", error);
        setError(error.message || 'Failed to fetch search results.');
      })
      .finally(() => { setLoading(false); });
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, apiUrl, showOnlyOwned, showProxies]);

  return (
    <Box>
      <HStack mb={4}>
        <AdvancedSearchInput
          placeholder="Search... e.g., 'zoro color:red id:ST01- pack:OP01'"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IconButton
          aria-label="Search Help"
          icon={<QuestionOutlineIcon />}
          size="lg"
          onClick={onHelpOpen}
        />
      </HStack>
      <Flex justify="flex-end" mb={6} gap={6}>
          <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="show-only-owned-switch" mb="0" mr={3} fontSize="sm">
                  Show In Collection Only
              </FormLabel>
              <Switch
                id="show-only-owned-switch"
                isChecked={showOnlyOwned}
                onChange={(e) => setShowOnlyOwned(e.target.checked)}
              />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="show-proxies-switch" mb="0" mr={3} fontSize="sm">
                  Show Proxy Count
              </FormLabel>
              <Switch
                id="show-proxies-switch"
                isChecked={showProxies}
                onChange={(e) => setShowProxies(e.target.checked)}
              />
          </FormControl>
      </Flex>
      {loading && <Spinner />}
      {error && <Text color="red.500">Error: {error}</Text>}
      <VStack spacing={2} align="stretch">
        {results.map((card) => {
          const keywords = extractStyledKeywords(card.effect, card.trigger_effect);
          return (
            <Box
              key={card.id}
              p={3}
              shadow="sm"
              borderWidth="1px"
              borderRadius="md"
              onClick={() => handleCardClick(card)}
              cursor="pointer"
              _hover={{ shadow: 'md', bg: 'gray.50' }}
            >
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={1.5} flex={1} minW={0}>
                  <Wrap spacingX={4} spacingY={1} align="center">
                    <WrapItem>
                      <HStack>
                        <Text fontWeight="bold" fontSize="md" noOfLines={1}>{card.name}</Text>
                        <CardVariantIndicator cardId={card.id} />
                      </HStack>
                    </WrapItem>
                    {card.category && <WrapItem fontSize="sm" color="gray.600">{toTitleCase(card.category)}</WrapItem>}
                    {card.attributes && card.attributes.length > 0 && card.attributes.map(attr => (<WrapItem key={attr}><Tag size="sm" variant="outline" colorScheme="gray">{toTitleCase(attr)}</Tag></WrapItem>))}
                    {card.cost !== null && <WrapItem fontSize="sm">Cost: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.cost}</Text></WrapItem>}
                    {card.power !== null && <WrapItem fontSize="sm">Power: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.power}</Text></WrapItem>}
                    {card.counter !== null && <WrapItem fontSize="sm">Counter: <Text as="span" fontWeight="semibold" color="black" ml={1}>{card.counter}</Text></WrapItem>}
                  </Wrap>
                  <Wrap spacingX={4} spacingY={1} align="center">
                    <WrapItem><Tag size="sm" {...getTagStyles(card.color)}>{card.card_code}</Tag></WrapItem>
                    {card.rarity && <WrapItem fontSize="sm" color="gray.800" fontWeight="semibold">{card.rarity}</WrapItem>}
                    {card.types && card.types.length > 0 && card.types.map(type => (<WrapItem key={type}><Tag size="sm" variant="outline">{toTitleCase(type)}</Tag></WrapItem>))}
                  </Wrap>
                  {keywords.length > 0 ? (
                    <Wrap align="center" pt={1}>
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" mr={2}>Keywords:</Text>
                      {keywords.map(kw => (
                          <WrapItem key={kw}><Tag size="sm" variant="subtle" colorScheme="gray">{kw}</Tag></WrapItem>
                      ))}
                    </Wrap>
                  ) : ( <Box h="22px" /> )}
                </VStack>
                <HStack spacing={4} ml={4}>
                  {showProxies && (<VStack spacing={0}><Text fontSize="xs" color="gray.500">Proxy</Text><CountControl cardId={card.id} type="proxy" count={card.proxy_count} onUpdate={handleCountUpdate} /></VStack>)}
                  <VStack spacing={0}><Text fontSize="xs" color="gray.500">Owned</Text><CountControl cardId={card.id} type="owned" count={card.owned_count} onUpdate={handleCountUpdate} /></VStack>
                </HStack>
              </Flex>
            </Box>
        )})}
      </VStack>

      {/* Card Detail Modal */}
      {selectedCard && (
        <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="4xl" isCentered>
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
                  <Image borderRadius="lg" width={{ base: '100%', md: '250px' }} src={selectedCard.img_url} alt={selectedCard.name} fallbackSrc='https://via.placeholder.com/250x350?text=No+Image' />
                </Box>
                <VStack align="stretch" spacing={3} flex={1}>
                  <Wrap spacing={2}>
                    <WrapItem><Tag size="lg" {...getTagStyles(selectedCard.color)}>{selectedCard.card_code}</Tag></WrapItem>
                    <WrapItem><Tag size="lg" colorScheme="gray">{selectedCard.category}</Tag></WrapItem>
                    <WrapItem><Tag size="lg" colorScheme="gray">{selectedCard.rarity}</Tag></WrapItem>
                  </Wrap>
                  <HStack spacing={6} divider={<StackDivider />} pt={1}>
                    {selectedCard.cost !== null && <Stat><StatLabel>Cost</StatLabel><StatNumber>{selectedCard.cost}</StatNumber></Stat>}
                    {selectedCard.power !== null && <Stat><StatLabel>Power</StatLabel><StatNumber>{selectedCard.power}</StatNumber></Stat>}
                    {selectedCard.counter !== null && <Stat><StatLabel>Counter</StatLabel><StatNumber>{selectedCard.counter}</StatNumber></Stat>}
                  </HStack>
                  <VStack spacing={4} align="stretch" pt={2}>
                    <StyledTextRenderer text={selectedCard.effect} />
                    <StyledTextRenderer text={selectedCard.trigger_effect} />
                  </VStack>
                   <Box pt={2}>
                    <Heading size="sm" mb={1}>Appears In</Heading>
                    <Wrap>
                      {selectedCard.packs?.split(', ').map(pack => (
                        <WrapItem key={pack}><Tag size="sm">{pack}</Tag></WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                  <HStack justify="flex-start" pt={3} borderTopWidth="1px" borderColor="gray.200" spacing={10}>
                      <VStack spacing={0}><Text fontSize="sm" fontWeight="bold" color="gray.500">Owned</Text><CountControl cardId={selectedCard.id} type="owned" count={selectedCard.owned_count} onUpdate={handleCountUpdate} /></VStack>
                      {showProxies && (<VStack spacing={0}><Text fontSize="sm" fontWeight="bold" color="gray.500">Proxy</Text><CountControl cardId={selectedCard.id} type="proxy" count={selectedCard.proxy_count} onUpdate={handleCountUpdate} /></VStack>)}
                  </HStack>
                </VStack>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={onDetailClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Advanced Search Syntax</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>You can combine general text with special keywords to narrow down your search.</Text>
              <Box>
                <Heading size="sm">Keywords</Heading>
                <Text>Use <Code>id:</Code> to search for cards by their ID or code prefix.</Text>
                <Text>Use <Code>pack:</Code> to filter for cards within a specific pack.</Text>
              </Box>
              <Box>
                <Heading size="sm">Examples</Heading>
                <VStack align="stretch" mt={2}>
                   <Text><Code>roronoa zoro</Code> - Fuzzy search for card text.</Text>
                   <Text><Code>id:ST01-001</Code> - Finds cards with an ID starting with "ST01-001".</Text>
                   <Text><Code>pack:OP01</Code> - Shows only cards from packs starting with "OP01".</Text>
                   <Text><Code>zoro id:ST01- pack:ST01</Code> - A combined search.</Text>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onHelpClose}>Got it!</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
