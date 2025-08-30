'use client';

import React, { useState, useEffect, useReducer, useRef } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Box, Text, VStack, HStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  FormControl, FormLabel, Input, Select, Textarea, Tag, IconButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useDisclosure, useToast,
  Spinner
} from '@chakra-ui/react';
import { FiMapPin, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

// Color swatch picker for marker selection
const colorOptions = [
  { value: 'red', label: 'Red', color: 'red.500' },
  { value: 'orange', label: 'Orange', color: 'orange.500' },
  { value: 'yellow', label: 'Yellow', color: 'yellow.400' },
  { value: 'green', label: 'Green', color: 'green.500' },
  { value: 'blue', label: 'Blue', color: 'blue.500' },
  { value: 'purple', label: 'Purple', color: 'purple.500' },
  { value: 'pink', label: 'Pink', color: 'pink.500' },
  { value: 'gray', label: 'Gray', color: 'gray.500' }
];

const typeOptions = [
  { value: 'case', label: 'Case' },
  { value: 'box', label: 'Box' },
  { value: 'binder', label: 'Binder' }
];

const initialState = {
  locations: [],
  isLoading: false,
  newLocation: {
    name: '',
    type: 'box',
    description: '',
    marker: 'blue',
    notes: ''
  },
  editingLocation: null,
  locationToDelete: null,
  errors: {
    name: '',
    type: ''
  },
  isCreated: false
};

const locationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOCATIONS':
      return { ...state, locations: action.payload };
    case 'UPDATE_NEW_LOCATION_FIELD':
      return {
        ...state,
        newLocation: { ...state.newLocation, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' }
      };
    case 'UPDATE_EDITING_LOCATION_FIELD':
      return {
        ...state,
        editingLocation: { ...state.editingLocation, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' }
      };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.message } };
    case 'RESET_NEW_LOCATION':
      return {
        ...state,
        newLocation: initialState.newLocation,
        errors: initialState.errors,
        isCreated: false
      };
    case 'SET_EDITING_LOCATION':
      return {
        ...state,
        editingLocation: action.payload ? { ...action.payload } : null,
        errors: initialState.errors
      };
    case 'SET_LOCATION_TO_DELETE':
      return { ...state, locationToDelete: action.payload };
    case 'SET_CREATED':
      return { ...state, isCreated: action.payload };
    default:
      return state;
  }
};

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Swatch color picker component
const ColorMarkerPicker = ({ value, onChange }) => (
  <HStack spacing={3} flexWrap="wrap">
    {colorOptions.map(option => (
      <Button
        key={option.value}
        aria-label={option.label}
        size="sm"
        borderRadius="full"
        borderWidth={value === option.value ? '2px' : '1px'}
        borderColor={value === option.value ? 'blue.600' : 'gray.300'}
        bg={option.color}
        _hover={{ borderColor: 'blue.300', transform: 'scale(1.15)' }}
        _focus={{ boxShadow: 'outline', borderColor: 'blue.500' }}
        onClick={() => onChange(option.value)}
        minW="32px"
        minH="32px"
        maxW="32px"
        maxH="32px"
        boxShadow={value === option.value ? 'md' : undefined}
        position="relative"
        role="radio"
        aria-checked={value === option.value}
      >
        {value === option.value && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%,-50%)"
            color="white"
            fontSize="xl"
            fontWeight="bold"
            pointerEvents="none"
          >
            ✓
          </Box>
        )}
      </Button>
    ))}
  </HStack>
);

const LocationManagementModal = ({ isOpen, onClose }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef();

  // Fetch locations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/locations`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'SET_LOCATIONS', payload: data });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch locations',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const validateForm = (location) => {
    let isValid = true;

    if (!location.name || location.name.trim().length === 0) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: 'Location name is required.' });
      isValid = false;
    }

    if (!location.type) {
      dispatch({ type: 'SET_ERROR', field: 'type', message: 'Location type is required.' });
      isValid = false;
    }

    return isValid;
  };

  const handleCreateLocation = async () => {
    if (!validateForm(state.newLocation)) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(state.newLocation),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Location Created',
          description: `Location "${state.newLocation.name}" has been created successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        dispatch({ type: 'SET_CREATED', payload: true });
        await fetchLocations();
      } else {
        if (res.status === 409) {
          dispatch({ type: 'SET_ERROR', field: 'name', message: data.message });
        } else {
          toast({
            title: 'Error',
            description: data.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleUpdateLocation = async () => {
    if (!validateForm(state.editingLocation)) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/locations/${state.editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(state.editingLocation),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Location Updated',
          description: `Location "${state.editingLocation.name}" has been updated successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onEditClose();
        await fetchLocations();
      } else {
        if (res.status === 409) {
          dispatch({ type: 'SET_ERROR', field: 'name', message: data.message });
        } else {
          toast({
            title: 'Error',
            description: data.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleDeleteLocation = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/locations/${state.locationToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Location Deleted',
          description: `Location "${state.locationToDelete.name}" has been deleted successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onAlertClose();
        await fetchLocations();
      } else {
        toast({
          title: 'Error',
          description: data.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: "Could not connect to server.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      onAlertClose();
    }
  };

  const openCreateModal = () => {
    dispatch({ type: 'RESET_NEW_LOCATION' });
    onCreateOpen();
  };

  const closeCreateModal = () => {
    dispatch({ type: 'RESET_NEW_LOCATION' });
    onCreateClose();
  };

  const openEditModal = (location) => {
    dispatch({ type: 'SET_EDITING_LOCATION', payload: location });
    onEditOpen();
  };

  const closeEditModal = () => {
    dispatch({ type: 'SET_EDITING_LOCATION', payload: null });
    onEditClose();
  };

  const openDeleteDialog = (location) => {
    dispatch({ type: 'SET_LOCATION_TO_DELETE', payload: location });
    onAlertOpen();
  };

  const closeDeleteDialog = () => {
    dispatch({ type: 'SET_LOCATION_TO_DELETE', payload: null });
    onAlertClose();
  };

  const handleInputChange = (field, value) => {
    dispatch({ type: 'UPDATE_NEW_LOCATION_FIELD', field, value });
  };

  const handleEditInputChange = (field, value) => {
    dispatch({ type: 'UPDATE_EDITING_LOCATION_FIELD', field, value });
  };

  const isFormValid = state.newLocation.name && state.newLocation.type &&
                     !state.errors.name && !state.errors.type;

  const isEditFormValid = state.editingLocation && state.editingLocation.name &&
                         state.editingLocation.type && !state.errors.name && !state.errors.type;

  return (
    <>
      {/* Main Location Management Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiMapPin />
              <Text>Manage Locations</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {state.isLoading && state.locations.length === 0 ? (
              <Box py={12} textAlign="center">
                <Spinner size="lg" />
                <Text mt={4} color="gray.600">Loading locations...</Text>
              </Box>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Description</Th>
                      <Th>Marker</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {state.locations.map((location) => (
                      <Tr key={location.id}>
                        <Td fontWeight="medium">{location.name}</Td>
                        <Td>
                          <Tag
                            colorScheme="blue"
                            size="sm"
                            textTransform="capitalize"
                          >
                            {location.type}
                          </Tag>
                        </Td>
                        <Td maxW="200px">
                          <Text fontSize="sm" color="gray.600" noOfLines={2}>
                            {location.description || '-'}
                          </Text>
                        </Td>
                        <Td>
                          <Tag
                            colorScheme={location.marker}
                            size="sm"
                            textTransform="capitalize"
                          >
                            {location.marker}
                          </Tag>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="Edit location"
                              icon={<FiEdit2 />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => openEditModal(location)}
                            />
                            <IconButton
                              aria-label="Delete location"
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => openDeleteDialog(location)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                    {state.locations.length === 0 && !state.isLoading && (
                      <Tr>
                        <Td colSpan={5} textAlign="center" py={8}>
                          <Text color="gray.500">No locations found. Create your first location!</Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button onClick={onClose}>Close</Button>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={openCreateModal}
                isLoading={state.isLoading}
              >
                New Location
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Location Modal */}
      <Modal isOpen={isCreateOpen} onClose={closeCreateModal} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent maxH="80vh" display="flex" flexDirection="column">
          <ModalHeader>
            <HStack spacing={3}>
              <FiPlus />
              <Text>Create New Location</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            flex="1"
            overflowY="auto"
            px={6}
            py={4}
            maxH="calc(80vh - 120px)"
          >
            {state.isCreated ? (
              <Box textAlign="center" py={8}>
                <Text fontSize="lg" fontWeight="bold" color="green.600" mb={4}>
                  Location Created Successfully! ✅
                </Text>
                <Text color="gray.600">
                  Your new location has been added to your collection.
                </Text>
              </Box>
            ) : (
              <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!state.errors.name}>
                  <FormLabel>Location Name</FormLabel>
                  <Input
                    value={state.newLocation.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Main Deck Box, Binder #1"
                    maxLength={255}
                  />
                  {state.errors.name && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {state.errors.name}
                    </Text>
                  )}
                </FormControl>

                <FormControl isRequired isInvalid={!!state.errors.type}>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={state.newLocation.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {state.errors.type && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {state.errors.type}
                    </Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={state.newLocation.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description of this location"
                    maxLength={500}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Color Marker</FormLabel>
                  <ColorMarkerPicker
                    value={state.newLocation.marker}
                    onChange={value => handleInputChange('marker', value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={state.newLocation.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Optional notes about this location"
                    maxLength={1000}
                    rows={3}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {state.isCreated ? (
              <Button onClick={closeCreateModal} colorScheme="blue">
                Done
              </Button>
            ) : (
              <HStack spacing={3}>
                <Button onClick={closeCreateModal}>Cancel</Button>
                <Button
                  colorScheme="blue"
                  onClick={handleCreateLocation}
                  isLoading={state.isLoading}
                  isDisabled={!isFormValid}
                  loadingText="Creating..."
                >
                  Create Location
                </Button>
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Location Modal */}
      <Modal isOpen={isEditOpen} onClose={closeEditModal} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent maxH="80vh" display="flex" flexDirection="column">
          <ModalHeader>
            <HStack spacing={3}>
              <FiEdit2 />
              <Text>Edit Location</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            flex="1"
            overflowY="auto"
            px={6}
            py={4}
            maxH="calc(80vh - 120px)"
          >
            {state.editingLocation && (
              <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!state.errors.name}>
                  <FormLabel>Location Name</FormLabel>
                  <Input
                    value={state.editingLocation.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                    placeholder="e.g., Main Deck Box, Binder #1"
                    maxLength={255}
                  />
                  {state.errors.name && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {state.errors.name}
                    </Text>
                  )}
                </FormControl>

                <FormControl isRequired isInvalid={!!state.errors.type}>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={state.editingLocation.type}
                    onChange={(e) => handleEditInputChange('type', e.target.value)}
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {state.errors.type && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {state.errors.type}
                    </Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={state.editingLocation.description}
                    onChange={(e) => handleEditInputChange('description', e.target.value)}
                    placeholder="Optional description of this location"
                    maxLength={500}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Color Marker</FormLabel>
                  <ColorMarkerPicker
                    value={state.editingLocation.marker}
                    onChange={value => handleEditInputChange('marker', value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={state.editingLocation.notes}
                    onChange={(e) => handleEditInputChange('notes', e.target.value)}
                    placeholder="Optional notes about this location"
                    maxLength={1000}
                    rows={3}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button onClick={closeEditModal}>Cancel</Button>
              <Button
                colorScheme="blue"
                onClick={handleUpdateLocation}
                isLoading={state.isLoading}
                isDisabled={!isEditFormValid}
                loadingText="Updating..."
              >
                Update Location
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Location
            </AlertDialogHeader>

            <AlertDialogBody>
              {state.locationToDelete && (
                <VStack align="stretch" spacing={3}>
                  <Text>
                    Are you sure you want to delete this location?
                  </Text>
                  <Box bg="gray.50" p={3} borderRadius="md">
                    <Text fontWeight="bold">{state.locationToDelete.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      Type: {state.locationToDelete.type}
                    </Text>
                    {state.locationToDelete.description && (
                      <Text fontSize="sm" color="gray.600">
                        Description: {state.locationToDelete.description}
                      </Text>
                    )}
                  </Box>
                  <Text fontSize="sm" color="red.600">
                    This action cannot be undone. Any cards assigned to this location will have their location removed.
                  </Text>
                </VStack>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteLocation}
                ml={3}
                isLoading={state.isLoading}
                loadingText="Deleting..."
              >
                Delete Location
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default LocationManagementModal;
