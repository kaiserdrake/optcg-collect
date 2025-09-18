import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody,
  Box, Text, VStack, Heading, Button, Code
} from '@chakra-ui/react';

const SearchHelpModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent maxW="lg">
        <ModalHeader>Advanced Search Syntax</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text>
              You can combine general text with special keywords to narrow down your search.
              <strong> Press Enter or click the Search button to search.</strong>
            </Text>

            <Box>
              <Heading size="sm">Keywords</Heading>
              <VStack align="stretch" spacing={1} mt={2}>
                <Text>Use <Code>id:</Code> to search for cards by their ID or code (substring match).</Text>
                <Text>Use <Code>pack:</Code> to filter for cards within a specific pack.</Text>
                <Text>Use <Code>color:</Code> to filter for cards of a specific color.</Text>
                <Text>Use <Code>category:</Code> to filter for cards of a specific category (e.g. leader, stage).</Text>
                <Text>Use <Code>cost:</Code> to filter by card cost (supports exact, range, less than, greater than).</Text>
                <Text>Use <Code>tag:</Code> to filter for cards with specific tags (e.g. <Code>tag:banned</Code>, <Code>tag:favorite</Code>).</Text>
                <Text>Use <Code>location:</Code> to show all cards in a location by name (e.g. <Code>location:binder1</Code>).</Text>
                <Text>
                  Use <Code>exact:</Code> to search for text in card names, effects, trigger effects, attributes, and types (substring match).
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading size="sm">Improved Search</Heading>
              <VStack align="stretch" spacing={1} mt={2}>
                <Text><strong>Fuzzy search</strong> only matches card name, attributes, and types.</Text>
                <Text><strong>ID/Code search</strong> uses substring matching instead of fuzzy search for exact results.</Text>
                <Text><strong>Effect and trigger search</strong> (via exact:) uses substring matching for precise text matching.</Text>
              </VStack>
            </Box>

            <Box>
              <Heading size="sm">Cost Filter Examples</Heading>
              <VStack align="stretch" mt={2}>
                <Text>
                  <Code>cost:5</Code> - Find cards with exactly 5 cost.
                </Text>
                <Text>
                  <Code>cost:3-5</Code> - Find cards with cost between 3 and 5 (inclusive).
                </Text>
                <Text>
                  <Code>cost:&lt;5</Code> - Find cards with cost less than 5.
                </Text>
                <Text>
                  <Code>cost:&gt;7</Code> - Find cards with cost greater than 7.
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading size="sm">Tag Filter Examples</Heading>
              <VStack align="stretch" mt={2}>
                <Text>
                  <Code>tag:banned</Code> - Find all cards marked as banned (global tag).
                </Text>
                <Text>
                  <Code>tag:favorite</Code> - Find all cards you've marked as favorite.
                </Text>
                <Text>
                  <Code>tag:want</Code> - Find all cards you've marked as want.
                </Text>
                <Text>
                  <Code>tag:restricted</Code> - Find all cards marked as restricted (global tag).
                </Text>
                <Text>
                  <Code>tag:favorite tag:banned</Code> - Find cards that are either favorite OR banned (multiple tags work with OR logic).
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading size="sm">Multiple Keywords</Heading>
              <VStack align="stretch" spacing={1} mt={2}>
                <Text><strong>Multiple color filters</strong> work with OR logic: <Code>color:red color:blue</Code> finds red OR blue cards.</Text>
                <Text><strong>Multiple tag filters</strong> work with OR logic: <Code>tag:favorite tag:want</Code> finds cards that are favorite OR want.</Text>
                <Text><strong>Different keyword types</strong> work with AND logic: <Code>category:leader tag:favorite</Code> finds leader cards that are also favorite.</Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SearchHelpModal;
