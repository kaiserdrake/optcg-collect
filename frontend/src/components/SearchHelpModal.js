import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody,
  Box, Text, VStack, Heading, Button, Code
} from '@chakra-ui/react';

const SearchHelpModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Advanced Search Syntax</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text>
              You can combine general text with special keywords to narrow down your search.
            </Text>

            <Box>
              <Heading size="sm">Keywords</Heading>
              <Text>Use <Code>id:</Code> to search for cards by their ID or code prefix.</Text>
              <Text>Use <Code>pack:</Code> to filter for cards within a specific pack.</Text>
              <Text>Use <Code>color:</Code> to filter for cards of a specific color.</Text>
              <Text>Use <Code>exact:</Code> to search for exact text matches in card names and effects.</Text>
            </Box>

            <Box>
              <Heading size="sm">Examples</Heading>
              <VStack align="stretch" mt={2}>
                <Text>
                  <Code>roronoa zoro</Code> - Fuzzy search for card text.
                </Text>
                <Text>
                  <Code>id:ST01-001</Code> - Finds cards with an ID starting with "ST01-001".
                </Text>
                <Text>
                  <Code>pack:OP01</Code> - Shows only cards from packs starting with "OP01".
                </Text>
                <Text>
                  <Code>color:red</Code> - Shows only red cards.
                </Text>
                <Text>
                  <Code>exact:"rush"</Code> - Finds cards containing exactly "rush" in name or effects.
                </Text>
                <Text>
                  <Code>zoro color:red id:ST01- pack:ST01</Code> - A combined search.
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Got it!
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SearchHelpModal;
