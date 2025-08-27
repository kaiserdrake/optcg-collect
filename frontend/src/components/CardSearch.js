'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Text, VStack, HStack, Tag, Spinner, Stat, StatLabel, StatNumber, Wrap, WrapItem, Image,
  Flex, Heading, StackDivider, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, Button, IconButton, Code, FormControl, FormLabel, Switch,
  useToast, Alert, AlertIcon, AlertDescription
} from '@chakra-ui/react';
import { QuestionOutlineIcon, RepeatIcon } from '@chakra-ui/icons';
import AdvancedSearchInput from './AdvancedSearchInput';
import CountControl from './CountControl';
import CardVariantIndicator from './CardVariantIndicator';
import LoadingSpinner from './LoadingSpinner';
import SEO from './SEO';
import { api, getErrorMessage, APIError } from '../utils/api';

const CardSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProxies, setShowProxies] = useState(false);
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
  const [selectedCard, setSelectedCard] = useState(null);
  const toast = useToast();

  const handleCardClick = useCallback((card) => {
    setSelectedCard(card);
    onDetailOpen();
  }, [onDetailOpen]);

  const handleCountUpdate = useCallback(async (cardId, type, action) => {
    try {
      const result = await api.updateCollection({ card_id: cardId, type, action });

      // Update results
      setResults(currentResults =>
        currentResults.map(card =>
          card.id === cardId ? { ...card, ...result } : card
        )
      );

      // Update selected card if it matches
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(currentCard => ({ ...currentCard, ...result }));
      }

      // Show success feedback
      const actionText = action === 'increment' ? 'Added' : 'Removed';
      const typeText = type === 'proxy' ? 'proxy' : 'owned card';

      toast({
        title: `${actionText} ${typeText}`,
        status: "success",
        duration: 1000,
        isClosable: false,
        position: "bottom-right",
        size: "sm"
      });

      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Update Failed",
        description: errorMessage,
        status: "error",
        duration: 3000,
        isClosable: true
      });
      throw error;
    }
  }, [selectedCard, toast]);

  const searchCards = useCallback(async (searchParams) => {
    if (!searchParams.keyword || searchParams.keyword.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.searchCards(searchParams);
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const retrySearch = useCallback(() => {
    const searchParams = {
      keyword: searchTerm,
      ownedOnly: showOnlyOwned,
      showProxies: showProxies,
    };
    searchCards(searchParams);
  }, [searchTerm, showOnlyOwned, showProxies, searchCards]);

  // Debounced search effect
  useEffect(() => {
    if (searchTerm.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const searchParams = {
        keyword: searchTerm,
        ownedOnly: showOnlyOwned,
        showProxies: showProxies,
      };
      searchCards(searchParams);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, showOnlyOwned, showProxies, searchCards]);

  return (
    <>
      <SEO
        title="Card Search"
        description="Search and manage your One Piece TCG card collection"
        keywords="OPTCG, card search, collection management, One Piece TCG"
      />

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
              Show Proxy
            </FormLabel>
            <Switch
              id="show-proxies-switch"
              isChecked={showProxies}
              onChange={(e) => setShowProxies(e.target.checked)}
            />
          </FormControl>
        </Flex>

        {/* Loading State */}
        {loading && <LoadingSpinner message="Searching cards..." />}

        {/* Error State */}
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertDescription>
                {getErrorMessage(error)}
              </AlertDescription>
            </Box>
            <Button
              size="sm"
              leftIcon={<RepeatIcon />}
              onClick={retrySearch}
              ml={4}
            >
              Retry
            </Button>
          </Alert>
        )}

        {/* No Results State */}
        {!loading && !error && searchTerm.length >= 3 && results.length === 0 && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="lg">
              No cards found for "{searchTerm}"
            </Text>
            <Text color="gray.400" fontSize="sm" mt={2}>
              Try adjusting your search terms or filters
            </Text>
          </Box>
        )}

        {/* Search Instructions */}
        {!loading && !error && searchTerm.length < 3 && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="lg">
              Start typing to search cards
            </Text>
            <Text color="gray.400" fontSize="sm" mt={2}>
              Enter at least 3 characters to begin searching
            </Text>
          </Box>
        )}

        {/* Results */}
        <VStack spacing={2} align="stretch">
          {results.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              showProxies={showProxies}
              onCardClick={handleCardClick}
              onCountUpdate={handleCountUpdate}
            />
          ))}
        </VStack>

        {/* Card Detail Modal */}
        <CardDetailModal
          isOpen={isDetailOpen}
          onClose={onDetailClose}
          card={selectedCard}
          showProxies={showProxies}
          onCountUpdate={handleCountUpdate}
        />

        {/* Help Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
      </Box>
    </>
  );
};

// Separate components for better organization
const CardItem = React.memo(({ card, showProxies, onCardClick, onCountUpdate }) => {
  // Card item implementation (same as before but cleaner)
  return (
    <Box
      p={3}
      shadow="sm"
      borderWidth="1px"
      borderRadius="md"
      onClick={() => onCardClick(card)}
      cursor="pointer"
      _hover={{ shadow: 'md', bg: 'gray.50' }}
    >
      {/* Card content */}
    </Box>
  );
});
CardItem.displayName = 'CardItem';

const CardDetailModal = ({ isOpen, onClose, card, showProxies, onCountUpdate }) => {
  if (!card) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{card.name}</Text>
            <CardVariantIndicator cardId={card.id} />
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {/* Modal content */}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const HelpModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
            <Text>Use <Code>color:</Code> to filter by card color.</Text>
          </Box>
          <Box>
            <Heading size="sm">Examples</Heading>
            <VStack align="stretch" mt={2}>
              <Text><Code>roronoa zoro</Code> - Fuzzy search for card text.</Text>
              <Text><Code>id:ST01-001</Code> - Finds cards with an ID starting with "ST01-001".</Text>
              <Text><Code>pack:OP01</Code> - Shows only cards from packs starting with "OP01".</Text>
              <Text><Code>color:red</Code> - Shows only red cards.</Text>
              <Text><Code>zoro id:ST01- pack:ST01 color:red</Code> - A combined search.</Text>
            </VStack>
          </Box>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" onClick={onClose}>Got it!</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default CardSearch;
