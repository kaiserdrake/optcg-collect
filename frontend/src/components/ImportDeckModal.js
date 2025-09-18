'use client';

import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  FormHelperText,
  useToast,
  Box,
} from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';

export default function ImportDeckModal({ isOpen, onClose, onImport }) {
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const toast = useToast();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const parseImportData = (importText) => {
    const lines = importText.trim().split('\n').filter(line => line.trim());
    const results = {
      cards: [],
      errors: [],
      processed: 0
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      results.processed++;
      const lineNumber = lineIndex + 1;


      // Parse the format: "4xOP10-082" or "4 x OP10-082" or variations
      const match = trimmedLine.match(/^(\S+)\s*x\s*(.+)$/i);

      if (!match) {
        results.errors.push({

          lineNumber,
          line: trimmedLine,
          error: 'Invalid format - expected "COUNT x CARD_ID"'
        });
        continue;
      }

      const countString = match[1].trim();
      let cardId = match[2].trim();


      // Parse and validate the count
      const count = parseInt(countString, 10);

      // Check if count is a valid integer and within range
      if (isNaN(count) || count < 1 || count > 4) {
        results.errors.push({
          lineNumber,
          line: trimmedLine,
          error: `Invalid count "${countString}" - must be a number between 1-4`
        });
        continue;
      }

      results.cards.push({ cardId, count });
    }

    return results;
  };

  const fetchCardById = async (cardId) => {
    try {
      const searchParams = new URLSearchParams({
        keyword: `id:${cardId}`,
        ownedOnly: 'false',
        showProxies: 'true'
      });

      const response = await fetch(`${api}/api/cards/search?${searchParams.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const searchResults = await response.json();
        return searchResults.length > 0 ? searchResults[0] : null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching card:', error);
      return null;
    }
  };

  const handleImport = async () => {

    if (!importData.trim()) {
      toast({
        title: 'Import Error',
        description: 'Please enter deck data to import',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsImporting(true);
    try {
      // Parse the import data
      const parseResults = parseImportData(importData);

      if (parseResults.cards.length === 0) {
        toast({
          title: 'Import Error',
          description: 'No valid cards found in the import data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Fetch card data for each parsed card
      const importedCards = [];
      const fetchErrors = [];

      for (const { cardId, count } of parseResults.cards) {
        const card = await fetchCardById(cardId);
        if (card) {
          importedCards.push({ card, count });
        } else {
          fetchErrors.push(`Card not found: ${cardId}`);
        }
      }

      // Show results
      if (importedCards.length > 0) {
        let successMessage = `Successfully imported ${importedCards.length} unique cards`;

        if (parseResults.errors.length > 0 || fetchErrors.length > 0) {
          const totalErrors = parseResults.errors.length + fetchErrors.length;
          successMessage += `, ${totalErrors} errors`;

          // Show detailed error information
          const errorDetails = [
            ...parseResults.errors.map(error =>
              `Line ${error.lineNumber}: "${error.line}" - ${error.error}`
            ),
            ...fetchErrors
          ].slice(0, 5).join('\n');

          const additionalErrors = (parseResults.errors.length + fetchErrors.length) > 5 ?
            `\n... and ${(parseResults.errors.length + fetchErrors.length) - 5} more errors` : '';

          toast({
            title: 'Import Completed with Errors',
            description: successMessage,
            status: 'warning',

            duration: 8000,
            isClosable: true,
          });

          // Show a second toast with error details
          toast({
            title: 'Error Details',
            description: errorDetails + additionalErrors,
            status: 'error',
            duration: 10000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'Import Successful',
            description: successMessage,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
        }

        // Pass the imported cards to the parent component
        onImport(importedCards);

        // Clear import data and close modal
        setImportData('');
        onClose();
      } else {
        toast({
          title: 'Import Failed',
          description: 'No valid cards could be imported',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: 'An unexpected error occurred during import',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleModalClose = () => {
    setImportData('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      size="lg"
      scrollBehavior="inside"

    >
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <FiUpload />
            <Text>Import Deck</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Paste your deck data below. Each line should be in the format:
            </Text>
            <Box bg="gray.100" p={3} borderRadius="md" fontFamily="monospace" fontSize="sm">
              <Text>1xOP11-040</Text>
              <Text>4xST18-001</Text>
              <Text>4xOP05-067</Text>
              <Text>4xEB01-061</Text>
            </Box>
            <FormControl>
              <FormLabel>Deck Data</FormLabel>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="1xOP11-040&#10;4xST18-001&#10;4xOP05-067&#10;4xEB01-061"
                rows={15}
                fontFamily="monospace"
                fontSize="sm"
              />
              <FormHelperText>
                This will add the cards to your current deck. You can manually save the deck afterwards.
              </FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={handleModalClose}
            isDisabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            colorScheme="green"
            onClick={handleImport}
            isLoading={isImporting}
            loadingText="Importing..."
            leftIcon={!isImporting ? <FiUpload /> : undefined}

          >
            Import Deck
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
