'use client';
import { useReducer, useEffect, useRef } from 'react';
import {
  Container, Heading, Button, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, IconButton, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel, Input,
  ModalFooter, useToast, Select, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
  AlertDialogOverlay, Code, Box, Tag, FormErrorMessage
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { FiKey, FiUser } from 'react-icons/fi';
import Navbar from '@/components/Navbar';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validateUsername, validateRequired } from '@/utils/validation';

// Reducer for managing complex form state
const initialState = {
  users: [],
  isLoading: false,
  newUser: {
    name: '',
    email: '',
    role: 'Normal User'
  },
  generatedPassword: '',
  userToDelete: null,
  userToEdit: null,
  userToEditAlias: null,
  newPassword: '',
  newAlias: '',
  errors: {
    name: '',
    email: '',
    password: '',
    alias: ''
  }
};

const userReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USERS':
      return { ...state, users: action.payload };

    case 'UPDATE_NEW_USER_FIELD':
      return {
        ...state,
        newUser: { ...state.newUser, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message }
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: { name: '', email: '', password: '', alias: '' }
      };

    case 'SET_GENERATED_PASSWORD':
      return { ...state, generatedPassword: action.payload };

    case 'SET_USER_TO_DELETE':
      return { ...state, userToDelete: action.payload };

    case 'SET_USER_TO_EDIT':
      return { ...state, userToEdit: action.payload };

    case 'SET_USER_TO_EDIT_ALIAS':
      return { ...state, userToEditAlias: action.payload };

    case 'UPDATE_NEW_PASSWORD':
      return {
        ...state,
        newPassword: action.payload,
        errors: { ...state.errors, password: '' }
      };

    case 'UPDATE_NEW_ALIAS':
      return {
        ...state,
        newAlias: action.payload,
        errors: { ...state.errors, alias: '' }
      };

    case 'RESET_NEW_USER_FORM_ONLY':
      return {
        ...state,
        newUser: { name: '', email: '', role: 'Normal User' },
        errors: { ...state.errors, name: '', email: '' }
      };

    case 'RESET_NEW_USER':
      return {
        ...state,
        newUser: { name: '', email: '', role: 'Normal User' },
        generatedPassword: '',
        errors: { ...state.errors, name: '', email: '' }
      };

    case 'RESET_PASSWORD_FORM':
      return {
        ...state,
        userToEdit: null,
        newPassword: '',
        errors: { ...state.errors, password: '' }
      };

    case 'RESET_ALIAS_FORM':
      return {
        ...state,
        userToEditAlias: null,
        newAlias: '',
        errors: { ...state.errors, alias: '' }
      };

    default:
      return state;
  }
};

export default function UserManagementModal({ isOpen, onClose }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  const {
    isOpen: isRegisterOpen,
    onOpen: onRegisterOpen,
    onClose: onRegisterClose
  } = useDisclosure();
  const {
    isOpen: isPasswordOpen,
    onOpen: onPasswordOpen,
    onClose: onPasswordClose
  } = useDisclosure();
  const {
    isOpen: isAliasOpen,
    onOpen: onAliasOpen,
    onClose: onAliasClose
  } = useDisclosure();
  const {
    isOpen: isAlertOpen,
    onOpen: onAlertOpen,
    onClose: onAlertClose
  } = useDisclosure();
  const {
    isOpen: isPasswordResultOpen,
    onOpen: onPasswordResultOpen,
    onClose: onPasswordResultClose
  } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();
  const { user } = useAuth();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Only fetch users when the modal is actually open
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${api}/api/users`, {
        credentials: 'include',
      });

      if (response.ok) {
        const users = await response.json();
        dispatch({ type: 'SET_USERS', payload: users });
      } else {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[UserManagementModal] Error fetching users:', error);
      toast({
        title: "Error fetching users",
        description: "Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteUser = async () => {
    if (!state.userToDelete) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${api}/api/users/${state.userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "User deleted successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        await fetchUsers(); // Refresh the user list
        onAlertClose();
        dispatch({ type: 'SET_USER_TO_DELETE', payload: null });
      } else {
        toast({
          title: "Error deleting user",
          description: data.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error deleting user",
        description: "Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const validateForm = () => {
    let isValid = true;
    dispatch({ type: 'CLEAR_ERRORS' });

    if (!validateRequired(state.newUser.name)) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: 'Name is required' });
      isValid = false;
    } else if (!validateUsername(state.newUser.name)) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: 'Name must be 3-30 characters, alphanumeric and underscores only' });
      isValid = false;
    }

    if (!validateRequired(state.newUser.email)) {
      dispatch({ type: 'SET_ERROR', field: 'email', message: 'Email is required' });
      isValid = false;
    } else if (!validateEmail(state.newUser.email)) {
      dispatch({ type: 'SET_ERROR', field: 'email', message: 'Please enter a valid email address' });
      isValid = false;
    }

    return isValid;
  };

  const validateAliasForm = () => {
    if (!state.newAlias.trim()) {
      dispatch({ type: 'SET_ERROR', field: 'alias', message: 'Alias is required' });
      return false;
    }
    if (state.newAlias.length > 255) {
      dispatch({ type: 'SET_ERROR', field: 'alias', message: 'Alias must be 255 characters or less' });
      return false;
    }
    return true;
  };

  const createUser = async () => {
    if (!validateForm()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${api}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(state.newUser),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the generated password first
        dispatch({ type: 'SET_GENERATED_PASSWORD', payload: data.generatedPassword });
        await fetchUsers(); // Refresh the user list

        // Close the create user modal but keep the generated password
        dispatch({ type: 'RESET_NEW_USER_FORM_ONLY' });
        onRegisterClose();

        // Open the password result dialog
        onPasswordResultOpen();

      } else {
        toast({
          title: "Error creating user",
          description: data.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error creating user",
        description: "Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateUserPassword = async () => {
    if (!state.newPassword.trim()) {
      dispatch({ type: 'SET_ERROR', field: 'password', message: 'Password is required' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${api}/api/users/${state.userToEdit.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword: state.newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        closePasswordModal();
      } else {
        toast({
          title: "Error updating password",
          description: data.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error updating password",
        description: "Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateUserAlias = async () => {
    if (!validateAliasForm()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${api}/api/users/${state.userToEditAlias.id}/alias`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ alias: state.newAlias.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Alias updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        await fetchUsers(); // Refresh the user list
        closeAliasModal();
      } else {
        toast({
          title: "Error updating alias",
          description: data.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('Error updating alias:', error);
      toast({
        title: "Error updating alias",
        description: "Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const openPasswordModal = (user) => {
    dispatch({ type: 'SET_USER_TO_EDIT', payload: user });
    onPasswordOpen();
  };

  const closePasswordModal = () => {
    dispatch({ type: 'RESET_PASSWORD_FORM' });
    onPasswordClose();
  };

  const openAliasModal = (user) => {
    dispatch({ type: 'SET_USER_TO_EDIT_ALIAS', payload: user });
    onAliasOpen();
  };

  const closeAliasModal = () => {
    dispatch({ type: 'RESET_ALIAS_FORM' });
    onAliasClose();
  };

  const openDeleteDialog = (user) => {
    dispatch({ type: 'SET_USER_TO_DELETE', payload: user });
    onAlertOpen();
  };

  const closeRegisterModal = () => {
    dispatch({ type: 'RESET_NEW_USER' });
    onRegisterClose();
  };

  const closePasswordResultModal = () => {
    // Clear the generated password when closing the result modal
    dispatch({ type: 'SET_GENERATED_PASSWORD', payload: '' });
    onPasswordResultClose();
  };

  const handleInputChange = (field, value) => {
    dispatch({ type: 'UPDATE_NEW_USER_FIELD', field, value });
  };

  const isFormValid = state.newUser.name && state.newUser.email &&
                     !state.errors.name && !state.errors.email;

  return (
    <>
      {/* Main User Management Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Manage Users</Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="flex-end">
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={onRegisterOpen}
                  isLoading={state.isLoading}
                  size="sm"
                >
                  New User
                </Button>
              </HStack>

              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Name</Th>
                      <Th>Alias</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {state.users.map((userItem) => (
                      <Tr key={userItem.id}>
                        <Td>{userItem.id}</Td>
                        <Td>{userItem.name}</Td>
                        <Td>{userItem.alias || 'Not set'}</Td>
                        <Td>{userItem.email}</Td>
                        <Td>
                          <Tag colorScheme={userItem.role === 'Admin' ? 'red' : 'green'}>
                            {userItem.role}
                          </Tag>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              icon={<FiKey />}
                              aria-label="Change Password"
                              size="sm"
                              colorScheme="orange"
                              variant="outline"
                              onClick={() => openPasswordModal(userItem)}
                              isDisabled={userItem.id === user?.id}
                            />
                            <IconButton
                              icon={<FiUser />}
                              aria-label="Set Alias"
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => openAliasModal(userItem)}
                              isDisabled={userItem.id === 1}
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              aria-label="Delete User"
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => openDeleteDialog(userItem)}
                              isDisabled={userItem.id === user?.id}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isRegisterOpen} onClose={closeRegisterModal}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Create New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!state.errors.name}>
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  value={state.newUser.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter username"
                />
                <FormErrorMessage>{state.errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!state.errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={state.newUser.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
                <FormErrorMessage>{state.errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={state.newUser.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                >
                  <option value="Normal User">Normal User</option>
                  <option value="Admin">Admin</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeRegisterModal}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={createUser}
              isLoading={state.isLoading}
              isDisabled={!isFormValid}
            >
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Generated Password Result Dialog */}
      <Modal isOpen={isPasswordResultOpen} onClose={closePasswordResultModal} closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>User Created Successfully</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>The user has been created successfully. Here is the generated password:</Text>
              <Box p={4} bg="green.50" borderRadius="md" w="full" textAlign="center">
                <Text fontSize="sm" fontWeight="semibold" color="green.800" mb={2}>
                  Generated Password:
                </Text>
                <Code colorScheme="green" fontSize="lg" p={3}>
                  {state.generatedPassword}
                </Code>
              </Box>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Please save this password securely. It won't be shown again.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={closePasswordResultModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Password Change Modal */}
      <Modal isOpen={isPasswordOpen} onClose={closePasswordModal}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Change Password for {state.userToEdit?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isInvalid={!!state.errors.password}>
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={state.newPassword}
                onChange={(e) => dispatch({ type: 'UPDATE_NEW_PASSWORD', payload: e.target.value })}
                placeholder="Enter new password"
              />
              <FormErrorMessage>{state.errors.password}</FormErrorMessage>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closePasswordModal}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={updateUserPassword}
              isLoading={state.isLoading}
            >
              Update Password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Alias Change Modal */}
      <Modal isOpen={isAliasOpen} onClose={closeAliasModal}>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Set Alias for {state.userToEditAlias?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isInvalid={!!state.errors.alias}>
              <FormLabel>Alias</FormLabel>
              <Input
                type="text"
                value={state.newAlias}
                onChange={(e) => dispatch({ type: 'UPDATE_NEW_ALIAS', payload: e.target.value })}
                placeholder="Enter alias"
              />
              <FormErrorMessage>{state.errors.alias}</FormErrorMessage>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeAliasModal}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={updateUserAlias}
              isLoading={state.isLoading}
            >
              Update Alias
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete user "{state.userToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={deleteUser} ml={3} isLoading={state.isLoading}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
