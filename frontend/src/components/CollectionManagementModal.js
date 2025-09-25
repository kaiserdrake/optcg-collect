'use client';

import { useState, useRef } from 'react';
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
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Box,
  Heading,
  Textarea,
  FormHelperText,
  Switch,
  Badge,
} from '@chakra-ui/react';
import { FiDatabase, FiDownload, FiUpload, FiTrash2, FiPlus } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function CollectionManagementModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const toast = useToast();

  // Export/Import collection state
  const [importData, setImportData] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState('override'); // 'override' or 'append'

  // Delete collection dialog state
  const { isOpen: isDeleteCollectionOpen, onOpen: onDeleteCollectionOpen, onClose: onDeleteCollectionClose } = useDisclosure();
  const deleteCollectionCancelRef = useRef();

  // Import collection dialog state
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const importCancelRef = useRef();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleExportCollection = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${api}/api/collection/export`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();

        // Format the collection data
        const exportLines = data.collection.map(item =>
          `${item.owned_count} x ${item.card_id}`
        );
        const exportText = exportLines.join('\n');

        // Create and download the file
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `collection_export_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Successful',
          description: `Exported ${data.collection.length} unique cards to file`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        const errorData = await res.json();
        toast({
          title: 'Export Failed',
          description: errorData.message || 'Failed to export collection',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCollection = async () => {
    if (!importData.trim()) {
      toast({
        title: 'Import Error',
        description: 'Please enter collection data to import',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch(`${api}/api/collection/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          collectionData: importData.trim(),
          mode: importMode // Send the import mode to the backend
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Create success message with error details if any
        const modeText = importMode === 'append' ? 'appended to' : 'updated in';
        let successMessage = `Successfully imported ${data.processed} cards. ${data.updated} cards ${modeText} your collection`;

        if (data.errors > 0 && data.errorLines && data.errorLines.length > 0) {
          successMessage += `, Errors: ${data.errors}`;

          // Show detailed error information
          const errorDetails = data.errorLines.slice(0, 5).map(errorInfo =>
            `Line ${errorInfo.lineNumber}: "${errorInfo.line}" - ${errorInfo.error}`
          ).join('\n');

          const additionalErrors = data.errorLines.length > 5 ?
            `\n... and ${data.errorLines.length - 5} more errors` : '';

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

        // Clear import data and close modal
        setImportData('');
        onImportClose();

        // Dispatch a custom event to notify other components to refresh
        const event = new CustomEvent('collectionUpdated');
        window.dispatchEvent(event);
      } else {
        // Handle server errors with detailed line information if available
        let errorMessage = data.message || 'Failed to import collection';

        if (data.errorLines && data.errorLines.length > 0) {
          const errorDetails = data.errorLines.slice(0, 3).map(errorInfo =>
            `Line ${errorInfo.lineNumber}: "${errorInfo.line}" - ${errorInfo.error}`
          ).join('\n');

          const additionalErrors = data.errorLines.length > 3 ?
            `\n... and ${data.errorLines.length - 3} more errors` : '';

          errorMessage = `${errorMessage}\n\nError Details:\n${errorDetails}${additionalErrors}`;
        }

        toast({
          title: 'Import Failed',
          description: errorMessage,
          status: 'error',
          duration: 10000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteCollection = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${api}/api/users/me/collection`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        const { deletedCards } = data;
        toast({
          title: 'Collection Deleted',
          description: `Successfully deleted ${deletedCards.total} cards (${deletedCards.owned} owned, ${deletedCards.proxy} proxy)`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Dispatch a custom event to notify other components to refresh
        const event = new CustomEvent('collectionUpdated');
        window.dispatchEvent(event);
      } else {
        toast({ title: 'Error', description: data.message, status: 'error', duration: 5000, isClosable: true });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: "Could not connect to server.", status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
      onDeleteCollectionClose();
    }
  };

  const handleModalClose = () => {
    setImportData('');
    onClose();
  };

  const handleImportModalClose = () => {
    setImportData('');
    setImportMode('override'); // Reset to default
    onImportClose();
  };

  if (!user) return null;

  return (
    <>
      {/* Main Collection Management Modal */}
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
              <FiDatabase />
              <Text>Manage Collection</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Import, export, or manage your card collection data.
              </Text>

              <Box borderWidth="1px" borderRadius="lg" p={4} bg="blue.50" borderColor="blue.200">
                <Heading size="sm" mb={3} color="blue.700">
                  <HStack spacing={2}>
                    <FiUpload />
                    <Text>Import Collection</Text>
                  </HStack>
                </Heading>
                <Text fontSize="sm" mb={3} color="blue.600">
                  Import card data from a text file or another application.
                </Text>
                <Button
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                  onClick={onImportOpen}
                  leftIcon={<FiUpload />}
                  isDisabled={isLoading}
                >
                  Import Collection
                </Button>
              </Box>

              <Box borderWidth="1px" borderRadius="lg" p={4} bg="green.50" borderColor="green.200">
                <Heading size="sm" mb={3} color="green.700">
                  <HStack spacing={2}>
                    <FiDownload />
                    <Text>Export Collection</Text>
                  </HStack>
                </Heading>
                <Text fontSize="sm" mb={3} color="green.600">
                  Export your collection to a text file for backup or sharing.
                </Text>
                <Button
                  colorScheme="green"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCollection}
                  isLoading={isExporting}
                  loadingText="Exporting..."
                  isDisabled={isLoading}
                  leftIcon={<FiDownload />}
                >
                  Export Collection
                </Button>
              </Box>

              <Box borderWidth="1px" borderRadius="lg" p={4} bg="orange.50" borderColor="orange.200">
                <Heading size="sm" mb={3} color="orange.700">
                  <HStack spacing={2}>
                    <FiTrash2 />
                    <Text>Delete Collection</Text>
                  </HStack>
                </Heading>
                <Text fontSize="sm" mb={3} color="orange.600">
                  Permanently delete your entire card collection. This cannot be undone.
                </Text>
                <VStack spacing={2} align="stretch">
                  <Text fontSize="xs" color="orange.500" fontStyle="italic">
                    Warning: This will delete all owned and proxy cards
                  </Text>
                  <Button
                    colorScheme="orange"
                    variant="outline"
                    size="sm"
                    onClick={onDeleteCollectionOpen}
                    isDisabled={isLoading}
                    leftIcon={<FiTrash2 />}
                  >
                    Delete Collection
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Import Collection Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={handleImportModalClose}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiUpload />
              <Text>Import Collection</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Paste your collection data below. Each line should be in the format:
              </Text>
              {/* Import Mode Switch */}
              <Box borderWidth="1px" borderRadius="md" p={4} bg="blue.50" borderColor="blue.200">
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={1} color="blue.700" fontWeight="semibold">
                      Import Mode
                    </FormLabel>
                    <Text fontSize="xs" color="blue.600">
                      {importMode === 'override'
                        ? 'Override: Set exact counts for each card (cards not listed will remain unchanged)'
                        : 'Append: Add to existing counts (if you have 2 cards and import 3, you\'ll have 5 total)'
                      }
                    </Text>
                  </Box>
                  <VStack spacing={2} align="center">
                    <HStack spacing={3}>
                      <Badge colorScheme={importMode === 'override' ? 'blue' : 'gray'} variant="solid">
                        Override
                      </Badge>
                      <Switch
                        colorScheme="green"
                        isChecked={importMode === 'append'}
                        onChange={(e) => setImportMode(e.target.checked ? 'append' : 'override')}
                        size="md"
                      />
                      <Badge colorScheme={importMode === 'append' ? 'green' : 'gray'} variant="solid">
                        Append
                      </Badge>
                    </HStack>
                    {importMode === 'append' && (
                      <HStack spacing={1}>
                        <FiPlus size="12px" />
                        <Text fontSize="xs" color="green.600" fontWeight="medium">
                          Add to existing
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </FormControl>
              </Box>

              <FormControl>
                <FormLabel>Collection Data</FormLabel>
                <Textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder={`4 x OP10-082\n1 x OP11-040_p1`}
                  rows={10}
                  fontFamily="monospace"
                  fontSize="sm"
                />
                <FormHelperText>
                  {importMode === 'override'
                    ? 'This will set the exact owned count for each card. Cards not in the list will remain unchanged.'
                    : 'This will add the specified counts to your existing collection. For example, if you own 2 cards and import 3, you\'ll have 5 total.'
                  }
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={handleImportModalClose}
              isDisabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              colorScheme={importMode === 'append' ? 'green' : 'blue'}
              onClick={handleImportCollection}
              isLoading={isImporting}
              loadingText="Importing..."
              leftIcon={!isImporting ? <FiUpload /> : undefined}
            >
              {importMode === 'append' ? 'Append to Collection' : 'Import Collection'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Collection Confirmation */}
      <AlertDialog
        isOpen={isDeleteCollectionOpen}
        leastDestructiveRef={deleteCollectionCancelRef}
        onClose={onDeleteCollectionClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Collection
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack spacing={3} align="stretch">
                <Text>
                  Are you sure you want to delete your entire card collection?
                </Text>
                <Box bg="orange.50" p={3} borderRadius="md" border="1px" borderColor="orange.200">
                  <Text fontSize="sm" color="orange.700" fontWeight="medium">
                    This will delete:
                  </Text>
                  <Text fontSize="sm" color="orange.600" mt={1}>
                    • All owned cards in your collection
                  </Text>
                  <Text fontSize="sm" color="orange.600">
                    • All proxy cards
                  </Text>
                  <Text fontSize="sm" color="orange.600">
                    • Collection statistics and history
                  </Text>
                </Box>
                <Text fontSize="sm" color="orange.600">
                  Your account will remain active, but your collection will be empty.
                  This action cannot be undone.
                </Text>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={deleteCollectionCancelRef}
                onClick={onDeleteCollectionClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteCollection}
                ml={3}
                isLoading={isLoading}
                loadingText="Deleting..."
              >
                I understand, delete my collection
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
