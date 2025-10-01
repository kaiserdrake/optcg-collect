import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useToast,
  Spinner,
  HStack,
  Text,
  Badge,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Textarea,
  VStack,
  Box,
  Tooltip
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { TAG_DEFINITIONS } from '@/utils/tagDefinitions';
import CardImage from './CardImage';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EditNoteDialog = ({ isOpen, onClose, tag, onSave }) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && tag) {
      setNote(tag.notes || '');
    }
  }, [isOpen, tag]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(tag, note);
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Note</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="semibold" mb={2}>Card: {tag?.card_name}</Text>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Tag: {TAG_DEFINITIONS[tag?.tag_type]?.label || tag?.tag_type}
              </Text>
            </Box>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter note for this tag..."
              rows={4}
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSaving}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const TagManagementModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef();

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const endpoint = user?.role === 'Admin'
        ? `${api}/api/tags/all`
        : `${api}/api/tags/user`;

      const res = await fetch(endpoint, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setTags(data);
      } else {
        throw new Error('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tags',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (tag) => {
    setSelectedTag(tag);
    onEditOpen();
  };

  const handleSaveNote = async (tag, note) => {
    try {
      const endpoint = tag.is_global
        ? `${api}/api/tags/admin/${tag.id}/note`
        : `${api}/api/tags/user/${tag.id}/note`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notes: note.trim() || null }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Note updated successfully',
          status: 'success',
          duration: 3000,
        });
        loadTags();
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        status: 'error',
        duration: 3000,
      });
      throw error;
    }
  };

  const handleDeleteTag = (tag) => {
    setSelectedTag(tag);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      const endpoint = selectedTag.is_global
        ? `${api}/api/cards/${encodeURIComponent(selectedTag.card_id)}/admin-tags`
        : `${api}/api/cards/${encodeURIComponent(selectedTag.card_id)}/tags`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tagType: selectedTag.tag_type,
          action: 'remove'
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Tag deleted successfully',
          status: 'success',
          duration: 3000,
        });
        loadTags();
        onDeleteClose();
      } else {
        throw new Error('Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tag',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: '4xl' }} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Tag Management</ModalHeader>
          <ModalCloseButton />
          <ModalBody px={{ base: 2, md: 6 }} pb={0}>
            {loading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" />
              </Box>
            ) : tags.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Text color="gray.500">No tags found</Text>
              </Box>
            ) : (
              <Box overflowX="auto" overflowY="visible">
                <Table variant="simple" size="sm" style={{ minWidth: '600px' }}>
                  <Thead>
                    <Tr>
                      <Th width="60px">Image</Th>
                      <Th>Card</Th>
                      <Th>Tag</Th>
                      <Th>Note</Th>
                      <Th width="80px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tags.map((tag) => {
                      const tagConfig = TAG_DEFINITIONS[tag.tag_type];
                      return (
                        <Tr key={tag.id}>
                          <Td>
                            <Box width="50px" height="70px">
                              <CardImage
                                src={tag.img_url}
                                alt={tag.card_name}
                                width="50px"
                                height="70px"
                                fallbackSrc="/placeholder.png"
                              />
                            </Box>
                          </Td>
                          <Td>
                            <VStack align="start" spacing={0}>
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                noOfLines={1}
                              >
                                {tag.card_name}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {tag.card_code}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={tagConfig?.colorScheme || 'gray'}
                              fontSize={{ base: '10px', md: '11px' }}
                            >
                              {tagConfig?.label || tag.tag_type}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm" noOfLines={2}>
                              {tag.notes || <Text as="span" color="gray.400">No note</Text>}
                            </Text>
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <Tooltip label="Edit Note">
                                <IconButton
                                  icon={<FiEdit2 />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={() => handleEditNote(tag)}
                                  aria-label="Edit note"
                                />
                              </Tooltip>
                              <Tooltip label="Delete Tag">
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleDeleteTag(tag)}
                                  aria-label="Delete tag"
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <EditNoteDialog
        isOpen={isEditOpen}
        onClose={onEditClose}
        tag={selectedTag}
        onSave={handleSaveNote}
      />

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={{ base: 4, md: 0 }}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Tag
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this tag from "{selectedTag?.card_name}"?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default TagManagementModal;
