'use client';
import { useReducer, useEffect, useRef } from 'react';
import {
  Container, Heading, Button, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, IconButton, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel, Input,
  ModalFooter, useToast, Select, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
  AlertDialogOverlay, Code, Box, Tag, FormErrorMessage
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { FiKey } from 'react-icons/fi';
import Navbar from '@/components/Navbar';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validateUsername, validateRequired } from '../../../utils/validation';

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

export default function ManageUsersPage() {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { isOpen: isRegisterOpen, onOpen: onRegisterOpen, onClose: onRegisterClose } = useDisclosure();
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();
  const { user: adminUser } = useAuth();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
        isClosable: true
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchUsers();
    }
  }, [adminUser]);

  const validateNewUserForm = () => {
    const { newUser } = state;
    let isValid = true;

    // Validate name
    const nameValidation = validateUsername(newUser.name);
    if (!nameValidation.isValid) {
      dispatch({ type: 'SET_ERROR', field: 'name', message: nameValidation.message });
      isValid = false;
    }

    // Validate email
    const emailValidation = validateEmail(newUser.email);
    if (!emailValidation.isValid) {
      dispatch({ type: 'SET_ERROR', field: 'email', message: emailValidation.message });
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateNewUserForm()) {
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
        fetchUsers();
        toast({
          title: "User Created",
          description: `Successfully created user: ${data.newUser.name}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to server.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleDelete = async () => {
    if (!state.userToDelete) return;

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
          description: data.message,
          status: "success",
          duration: 5000,
          isClosable: true
        });
        fetchUsers();
        dispatch({ type: 'SET_USER_TO_DELETE', payload: null });
        onAlertClose();
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to server.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handlePasswordChange = async () => {
    if (!state.userToEdit || !state.newPassword || state.newPassword.length < 8) {
      dispatch({ type: 'SET_ERROR', field: 'password', message: 'Password must be at least 8 characters long' });
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
          title: "Password Changed",
          description: data.message,
          status: "success",
          duration: 5000,
          isClosable: true
        });
        closePasswordModal();
      } else {
        toast({
          title: "Update Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to server.",
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
  };

  const isFormValid = state.newUser.name && state.newUser.email &&
                     !state.errors.name && !state.errors.email;

  return (
    <AdminGuard>
      <Navbar />
      <Container maxW="container.lg" py={8}>
        <HStack justify="space-between" mb={6}>
          <Heading>Manage Users</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onRegisterOpen}
            isLoading={state.isLoading}
          >
            New User
          </Button>
        </HStack>

        <Table variant="simple">
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
                <Td>{user.name}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <Tag colorScheme={user.role === 'Admin' ? 'purple' : 'gray'}>
                    {user.role}
                  </Tag>
                </Td>
                <Td>
                  {/* Actions are not available for the initial admin (ID 1) */}
                  {user.id !== 1 && (
                    <>
                      <IconButton
                        aria-label="Change user password"
                        icon={<FiKey />}
                        variant="ghost"
                        onClick={() => openPasswordModal(user)}
                        isDisabled={state.isLoading}
                        mr={2}
                      />
                      <IconButton
                        aria-label="Delete user"
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => openDeleteDialog(user)}
                        isDisabled={state.isLoading}
                      />
                    </>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Container>

      {/* Register User Modal */}
      <Modal isOpen={isRegisterOpen} onClose={closeRegisterModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Register a New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {state.generatedPassword ? (
              <VStack>
                <Text>User registered successfully!</Text>
                <Text>Please copy this one-time password and share it with the user securely.</Text>
                <Box p={3} bg="gray.100" borderRadius="md" w="100%" textAlign="center">
                  <Code fontSize="lg">{state.generatedPassword}</Code>
                </Box>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <FormControl isRequired isInvalid={!!state.errors.name}>
                  <FormLabel>Name</FormLabel>
                  <Input
                    placeholder="User's full name"
                    value={state.newUser.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    isDisabled={state.isLoading}
                  />
                  <FormErrorMessage>{state.errors.name}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!state.errors.email}>
                  <FormLabel>Email address</FormLabel>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={state.newUser.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    isDisabled={state.isLoading}
                  />
                  <FormErrorMessage>{state.errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl>
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
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeRegisterModal}>
              {state.generatedPassword ? 'Close' : 'Cancel'}
            </Button>
            {!state.generatedPassword && (
              <Button
                colorScheme="blue"
                onClick={handleRegister}
                isDisabled={!isFormValid}
                isLoading={state.isLoading}
              >
                Register
              </Button>
            )}
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
              Are you sure you want to delete user <strong>{state.userToDelete?.name}</strong>?
              <br/>
              <strong>This will also permanently delete all of their owned card data.</strong> This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                ml={3}
                isLoading={state.isLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Change Password Modal */}
      {state.userToEdit && (
        <Modal isOpen={isPasswordOpen} onClose={closePasswordModal}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Change Password for {state.userToEdit.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl isRequired isInvalid={!!state.errors.password}>
                <FormLabel>New Password</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter new password"
                  value={state.newPassword}
                  onChange={(e) => dispatch({ type: 'SET_NEW_PASSWORD', payload: e.target.value })}
                  isDisabled={state.isLoading}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Must be at least 8 characters long.
                </Text>
                <FormErrorMessage>{state.errors.password}</FormErrorMessage>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={closePasswordModal}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handlePasswordChange}
                isDisabled={state.newPassword.length < 8}
                isLoading={state.isLoading}
              >
                Save Password
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </AdminGuard>
  );
}
