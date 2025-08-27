'use client';
import { useState, useEffect, useRef } from 'react';
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

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Normal User');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null); // State for the user being edited
  const [newPassword, setNewPassword] = useState(''); // State for the new password input
  const [isEmailInvalid, setIsEmailInvalid] = useState(false);

  const { isOpen: isRegisterOpen, onOpen: onRegisterOpen, onClose: onRegisterClose } = useDisclosure();
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();
  const { user: adminUser } = useAuth();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchUsers = async () => {
    try {
        const res = await fetch(`${api}/api/users`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        } else {
            toast({ title: "Failed to fetch users", status: "error", duration: 5000, isClosable: true });
        }
    } catch (error) {
        toast({ title: "Network error", description: "Could not connect to the server.", status: "error", duration: 5000, isClosable: true });
    }
  };

  useEffect(() => {
    if (adminUser) {
        fetchUsers();
    }
  }, [adminUser]);

  const handleRegister = async () => {
    const res = await fetch(`${api}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: newUserEmail, name: newUserName, role: newUserRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedPassword(data.password);
      fetchUsers();
    } else {
      toast({ title: "Registration Failed", description: data.message, status: "error", duration: 5000, isClosable: true });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    const res = await fetch(`${api}/api/users/${userToDelete.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: "User Deleted", description: data.message, status: "success", duration: 5000, isClosable: true });
      fetchUsers();
    } else {
      toast({ title: "Deletion Failed", description: data.message, status: "error", duration: 5000, isClosable: true });
    }
    onAlertClose();
  };

  const handlePasswordChange = async () => {
    if (!userToEdit || !newPassword || newPassword.length < 8) return;

    const res = await fetch(`${api}/api/users/${userToEdit.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
        toast({ title: "Password Changed", description: data.message, status: "success", duration: 5000, isClosable: true });
        closePasswordModal();
    } else {
        toast({ title: "Update Failed", description: data.message, status: "error", duration: 5000, isClosable: true });
    }
  };

  const openPasswordModal = (user) => {
    setUserToEdit(user);
    onPasswordOpen();
  };

  const closePasswordModal = () => {
    setNewPassword('');
    onPasswordClose();
  };

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    onAlertOpen();
  };

  const closeRegisterModal = () => {
    setNewUserName('');
    setNewUserEmail('');
    setGeneratedPassword('');
    setIsEmailInvalid(false);
    onRegisterClose();
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setNewUserEmail(email);
    setIsEmailInvalid(email.length > 0 && !validateEmail(email));
  };

  const isRegisterFormInvalid = !newUserName || !newUserEmail || isEmailInvalid;

  return (
    <AdminGuard>
      <Navbar />
      <Container maxW="container.lg" py={8}>
        <HStack justify="space-between" mb={6}>
          <Heading>Manage Users</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onRegisterOpen}>
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
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>{user.id}</Td>
                <Td>{user.name}</Td>
                <Td>{user.email}</Td>
                <Td><Tag colorScheme={user.role === 'Admin' ? 'purple' : 'gray'}>{user.role}</Tag></Td>
                <Td>
                  {/* Actions are not available for the initial admin (ID 1) */}
                  {user.id !== 1 && (
                    <>
                      <IconButton
                        aria-label="Change user password"
                        icon={<FiKey />}
                        variant="ghost"
                        onClick={() => openPasswordModal(user)}
                      />
                      <IconButton
                        aria-label="Delete user"
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => openDeleteDialog(user)}
                      />
                    </>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Container>

      <Modal isOpen={isRegisterOpen} onClose={closeRegisterModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Register a New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {generatedPassword ? (
              <VStack>
                <Text>User registered successfully!</Text>
                <Text>Please copy this one-time password and share it with the user securely.</Text>
                <Box p={3} bg="gray.100" borderRadius="md" w="100%" textAlign="center">
                  <Code fontSize="lg">{generatedPassword}</Code>
                </Box>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input placeholder="User's full name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                </FormControl>
                <FormControl isRequired isInvalid={isEmailInvalid}>
                  <FormLabel>Email address</FormLabel>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={handleEmailChange}
                  />
                  {isEmailInvalid && (
                    <FormErrorMessage>Please enter a valid email address.</FormErrorMessage>
                  )}
                </FormControl>
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="Normal User">Normal User</option>
                    <option value="Admin">Admin</option>
                  </Select>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeRegisterModal}>
              {generatedPassword ? 'Close' : 'Cancel'}
            </Button>
            {!generatedPassword &&
              <Button
                colorScheme="blue"
                onClick={handleRegister}
                isDisabled={isRegisterFormInvalid}
              >
                Register
              </Button>
            }
          </ModalFooter>
        </ModalContent>
      </Modal>

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
              Are you sure you want to delete user **{userToDelete?.name}**?
              <br/>
              **This will also permanently delete all of their owned card data.** This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Change Password Modal */}
      {userToEdit && (
        <Modal isOpen={isPasswordOpen} onClose={closePasswordModal}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Change Password for {userToEdit.name}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl isRequired>
                        <FormLabel>New Password</FormLabel>
                        <Input
                            type="text"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>Must be at least 8 characters long.</Text>
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={closePasswordModal}>Cancel</Button>
                    <Button colorScheme="blue" onClick={handlePasswordChange} isDisabled={newPassword.length < 8}>Save Password</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
      )}
    </AdminGuard>
  );
}
