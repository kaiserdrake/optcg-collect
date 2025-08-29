'use client';

import { useReducer, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Heading,
  Button,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Code,
  Box,
  Tag,
  FormErrorMessage,
  Spinner,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { FiKey, FiUsers, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
};

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
  newPassword: '',
  errors: {
    name: '',
    email: '',
    password: ''
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

    case 'SET_GENERATED_PASSWORD':
      return { ...state, generatedPassword: action.payload };

    case 'SET_USER_TO_DELETE':
      return { ...state, userToDelete: action.payload };

    case 'SET_USER_TO_EDIT':
      return { ...state, userToEdit: action.payload };

    case 'SET_NEW_PASSWORD':
      return {
        ...state,
        newPassword: action.payload,
        errors: { ...state.errors, password: '' }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message }
      };

    case 'CLEAR_ERRORS':
      return { ...state, errors: { name: '', email: '', password: '' } };

    case 'RESET_NEW_USER':
      return {
        ...state,
        newUser: { name: '', email: '', role: 'Normal User' },
        generatedPassword: '',
        errors: { name: '', email: '', password: '' }
      };

    case 'RESET_PASSWORD_FORM':
      return {
        ...state,
        userToEdit: null,
        newPassword: '',
        errors: { ...state.errors, password: '' }
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
    isOpen: isAlertOpen,
    onOpen: onAlertOpen,
    onClose: onAlertClose
  } = useDisclosure();
  const {
    isOpen: isPasswordOpen,
    onOpen: onPasswordOpen,
    onClose: onPasswordClose
  } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();
  const { user: adminUser } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/users`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: 'SET_USERS', payload: data });
      } else {
        toast({
          title: "Failed to fetch users",
          status: "error",
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Could not connect to the server.",
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

  const openDeleteDialog = (user) => {
    dispatch({ type: 'SET_USER_TO_DELETE', payload: user });
    onAlertOpen();
  };

  const closeRegisterModal = () => {
    dispatch({ type: 'RESET_NEW_USER' });
    onRegisterClose();
  };

  const handleInputChange = (field, value) => {
    dispatch({ type: 'UPDATE_NEW_USER_FIELD', field, value });

    // Real-time validation
    if (field === 'email' && value && !validateEmail(value)) {
      dispatch({ type: 'SET_ERROR', field: 'email', message: 'Please enter a valid email address.' });
    }
    if (field === 'name' && value && !validateUsername(value)) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores.' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Final validation
    if (!validateEmail(state.newUser.email)) {
      dispatch({ type: 'SET_ERROR', field: 'email', message: 'Please enter a valid email address.' });
      return;
    }
    if (!validateUsername(state.newUser.name)) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: 'Invalid username format.' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(state.newUser),
      });

      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'SET_GENERATED_PASSWORD', payload: data.password });
        toast({
          title: "User Created",
          description: `${data.newUser.name} has been registered successfully.`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
        fetchUsers(); // Refresh the user list
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!state.newPassword || state.newPassword.length < 8) {
      dispatch({ type: 'SET_ERROR', field: 'password', message: 'Password must be at least 8 characters long.' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/users/${state.userToEdit.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: state.newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Password Updated",
          description: `Password for ${state.userToEdit.name} has been updated.`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
        closePasswordModal();
      } else {
        toast({
          title: "Update Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleDeleteUser = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${api}/api/users/${state.userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "User Deleted",
          description: `${state.userToDelete.name} has been removed.`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
        fetchUsers(); // Refresh the user list
        dispatch({ type: 'SET_USER_TO_DELETE', payload: null });
        onAlertClose();
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const isFormValid = state.newUser.name && state.newUser.email &&
                     !state.errors.name && !state.errors.email;

  return (
    <>
      {/* Main User Management Modal */}
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
              <FiUsers />
              <Text>Manage Users</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {state.isLoading && state.users.length === 0 ? (
              <Box py={12} textAlign="center">
                <Spinner size="lg" />
                <Text mt={4} color="gray.600">Loading users...</Text>
              </Box>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {state.users.map((user) => (
                      <Tr key={user.id}>
                        <Td>{user.id}</Td>
                        <Td fontWeight="medium">{user.name}</Td>
                        <Td color="gray.600">{user.email}</Td>
                        <Td>
                          <Tag
                            colorScheme={user.role === 'Admin' ? 'purple' : 'gray'}
                            size="sm"
                          >
                            {user.role}
                          </Tag>
                        </Td>
                        <Td>
                          {/* Actions are not available for the initial admin (ID 1) */}
                          {user.id !== 1 ? (
                            <HStack spacing={2}>
                              <IconButton
                                aria-label="Change user password"
                                icon={<FiKey />}
                                variant="ghost"
                                size="sm"
                                onClick={() => openPasswordModal(user)}
                                isDisabled={state.isLoading}
                                _hover={{ bg: 'blue.100', color: 'blue.600' }}
                              />
                              <IconButton
                                aria-label="Delete user"
                                icon={<DeleteIcon />}
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(user)}
                                isDisabled={state.isLoading}
                                _hover={{ bg: 'red.100', color: 'red.600' }}
                              />
                            </HStack>
                          ) : (
                            <Text fontSize="xs" color="gray.500">Protected</Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack justify="space-between" w="full">
              <Button
                leftIcon={<FiUserPlus />}
                colorScheme="blue"
                onClick={onRegisterOpen}
                isLoading={state.isLoading}
              >
                New User
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Register User Modal */}
      <Modal isOpen={isRegisterOpen} onClose={closeRegisterModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiUserPlus />
              <Text>Register New User</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {state.generatedPassword ? (
              <VStack spacing={6}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="green.600" mb={2}>
                    User registered successfully! ✅
                  </Text>
                  <Text color="gray.600">
                    Please copy this temporary password and share it securely with the user.
                  </Text>
                </Box>

                <Box
                  p={4}
                  bg="gray.100"
                  borderRadius="md"
                  w="100%"
                  textAlign="center"
                  border="1px"
                  borderColor="gray.300"
                >
                  <Text fontSize="sm" color="gray.600" mb={2}>Temporary Password</Text>
                  <Code fontSize="lg" fontWeight="bold" color="blue.600">
                    {state.generatedPassword}
                  </Code>
                </Box>

                <Text fontSize="sm" color="orange.600" textAlign="center">
                  ⚠️ The user should change this password immediately after first login.
                </Text>
              </VStack>
            ) : (
              <form onSubmit={handleRegister}>
                <VStack spacing={4}>
                  <FormControl isRequired isInvalid={!!state.errors.name}>
                    <FormLabel>Username</FormLabel>
                    <Input
                      placeholder="User's full name"
                      value={state.newUser.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      isDisabled={state.isLoading}
                    />
                    <FormErrorMessage>{state.errors.name}</FormErrorMessage>
                  </FormControl>

                  <FormControl isRequired isInvalid={!!state.errors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={state.newUser.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      isDisabled={state.isLoading}
                    />
                    <FormErrorMessage>{state.errors.email}</FormErrorMessage>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={state.newUser.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      isDisabled={state.isLoading}
                    >
                      <option value="Normal User">Normal User</option>
                      <option value="Admin">Admin</option>
                    </Select>
                  </FormControl>
                </VStack>
              </form>
            )}
          </ModalBody>

          <ModalFooter>
            {state.generatedPassword ? (
              <Button onClick={closeRegisterModal} colorScheme="blue">
                Done
              </Button>
            ) : (
              <HStack spacing={3}>
                <Button onClick={closeRegisterModal}>Cancel</Button>
                <Button
                  colorScheme="blue"
                  onClick={handleRegister}
                  isLoading={state.isLoading}
                  isDisabled={!isFormValid}
                  loadingText="Creating..."
                >
                  Create User
                </Button>
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordOpen} onClose={closePasswordModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiKey />
              <Text>Change Password</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {state.userToEdit && (
              <VStack spacing={4}>
                <Box textAlign="center" bg="gray.50" p={3} borderRadius="md" w="full">
                  <Text fontWeight="medium">Changing password for:</Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.600">
                    {state.userToEdit.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {state.userToEdit.email}
                  </Text>
                </Box>

                <form onSubmit={handlePasswordChange} style={{ width: '100%' }}>
                  <FormControl isRequired isInvalid={!!state.errors.password}>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      placeholder="Enter new password (min 8 characters)"
                      value={state.newPassword}
                      onChange={(e) => dispatch({ type: 'SET_NEW_PASSWORD', payload: e.target.value })}
                      isDisabled={state.isLoading}
                    />
                    <FormErrorMessage>{state.errors.password}</FormErrorMessage>
                  </FormControl>
                </form>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button onClick={closePasswordModal}>Cancel</Button>
              <Button
                colorScheme="blue"
                onClick={handlePasswordChange}
                isLoading={state.isLoading}
                isDisabled={!state.newPassword || state.newPassword.length < 8}
                loadingText="Updating..."
              >
                Update Password
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Confirmation */}
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User Account
            </AlertDialogHeader>

            <AlertDialogBody>
              {state.userToDelete && (
                <VStack spacing={3} align="stretch">
                  <Text>
                    Are you sure you want to delete the account for{' '}
                    <Text as="span" fontWeight="bold" color="red.600">
                      {state.userToDelete.name}
                    </Text>
                    ?
                  </Text>

                  <Box bg="red.50" p={3} borderRadius="md" border="1px" borderColor="red.200">
                    <Text fontSize="sm" color="red.700" fontWeight="medium">
                      This will permanently delete:
                    </Text>
                    <Text fontSize="sm" color="red.600" mt={1}>
                      • User account and profile
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      • All their card collection data
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      • Any decks they've created
                    </Text>
                  </Box>

                  <Text fontSize="sm" fontWeight="medium" color="red.600">
                    This action cannot be undone.
                  </Text>
                </VStack>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteUser}
                ml={3}
                isLoading={state.isLoading}
                loadingText="Deleting..."
              >
                Delete User
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
