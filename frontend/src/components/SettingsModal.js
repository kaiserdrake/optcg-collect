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
  Input,
  FormErrorMessage,
  FormHelperText,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Divider,
  Box,
  Heading,
  Tag,
  Stack,
} from '@chakra-ui/react';
import { FiSettings, FiUser, FiLock, FiTrash2, FiDatabase } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const toast = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Delete account dialog state
  const { isOpen: isDeleteAccountOpen, onOpen: onDeleteAccountOpen, onClose: onDeleteAccountClose } = useDisclosure();
  const deleteAccountCancelRef = useRef();

  // Delete collection dialog state
  const { isOpen: isDeleteCollectionOpen, onOpen: onDeleteCollectionOpen, onClose: onDeleteCollectionClose } = useDisclosure();
  const deleteCollectionCancelRef = useRef();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const passwordsMatch = newPassword === confirmPassword;
  const isNewPasswordValid = newPassword.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordsMatch || !isNewPasswordValid) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${api}/api/users/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Password Updated',
          description: data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({ title: 'Error', description: data.message, status: 'error', duration: 5000, isClosable: true });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: "Could not connect to server.", status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${api}/api/users/me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Account Deleted',
          description: data.message,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        logout();
      } else {
        toast({ title: 'Error', description: data.message, status: 'error', duration: 5000, isClosable: true });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: "Could not connect to server.", status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
      onDeleteAccountClose();
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
    // Clear form data when closing
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!user) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <FiSettings />
              <Text>Account Settings</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={8} align="stretch">
              {/* User Info Section */}
              <Box>
                <HStack spacing={3} mb={4}>
                  <FiUser />
                  <Heading size="md">Account Information</Heading>
                </HStack>
                <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="md">
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Name:</Text>
                    <Text>{user.name}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Email:</Text>
                    <Text>{user.email}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Role:</Text>
                    <Tag colorScheme={user.role === 'Admin' ? 'purple' : 'gray'}>
                      {user.role}
                    </Tag>
                  </HStack>
                </VStack>
              </Box>

              <Divider />

              {/* Change Password Section */}
              <Box>
                <HStack spacing={3} mb={4}>
                  <FiLock />
                  <Heading size="md">Change Password</Heading>
                </HStack>

                <form onSubmit={handleSubmit}>
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Current Password</FormLabel>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        isDisabled={isLoading}
                      />
                    </FormControl>

                    <FormControl isRequired isInvalid={newPassword.length > 0 && !isNewPasswordValid}>
                      <FormLabel>New Password</FormLabel>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        isDisabled={isLoading}
                      />
                      {newPassword.length > 0 && !isNewPasswordValid ? (
                        <FormErrorMessage>Password must be at least 8 characters long.</FormErrorMessage>
                      ) : (
                        <FormHelperText>Minimum 8 characters</FormHelperText>
                      )}
                    </FormControl>

                    <FormControl isRequired isInvalid={confirmPassword.length > 0 && !passwordsMatch}>
                      <FormLabel>Confirm New Password</FormLabel>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        isDisabled={isLoading}
                      />
                      <FormErrorMessage>Passwords do not match.</FormErrorMessage>
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={isLoading}
                      isDisabled={!passwordsMatch || !isNewPasswordValid || !currentPassword}
                      loadingText="Updating..."
                    >
                      Update Password
                    </Button>
                  </Stack>
                </form>
              </Box>

              <Divider />

              {/* Danger Zone */}
              <Box>
                <HStack spacing={3} mb={4}>
                  <FiDatabase />
                  <Heading size="md">Collection Management</Heading>
                </HStack>

                <Box bg="orange.50" p={4} borderRadius="md" border="1px" borderColor="orange.200">
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="sm" color="orange.700">
                      Delete your entire card collection while keeping your account.
                    </Text>
                    <Button
                      colorScheme="orange"
                      variant="outline"
                      size="sm"
                      onClick={onDeleteCollectionOpen}
                      isDisabled={isLoading}
                      leftIcon={<FiDatabase />}
                    >
                      Delete Collection
                    </Button>
                  </VStack>
                </Box>
              </Box>

              <Box>
                <HStack spacing={3} mb={4}>
                  <FiTrash2 color="red" />
                  <Heading size="md" color="red.600">Danger Zone</Heading>
                </HStack>

                <Box bg="red.50" p={4} borderRadius="md" border="1px" borderColor="red.200">
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="sm" color="red.700">
                      Once you delete your account, there is no going back. This action will permanently
                      delete your account and all your collection data.
                    </Text>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      onClick={onDeleteAccountOpen}
                      isDisabled={isLoading || user.id === 1}
                      leftIcon={<FiTrash2 />}
                    >
                      Delete Account
                    </Button>
                    {user.id === 1 && (
                      <Text fontSize="xs" color="red.500">
                        Primary admin account cannot be deleted.
                      </Text>
                    )}
                  </VStack>
                </Box>
              </Box>
            </VStack>
          </ModalBody>
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
                </Text>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteCollectionCancelRef} onClick={onDeleteCollectionClose}>
                Cancel
              </Button>
              <Button
                colorScheme="orange"
                onClick={handleDeleteCollection}
                ml={3}
                isLoading={isLoading}
                loadingText="Deleting..."
              >
                Delete Collection
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog
        isOpen={isDeleteAccountOpen}
        leastDestructiveRef={deleteAccountCancelRef}
        onClose={onDeleteAccountClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Account
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack spacing={3} align="stretch">
                <Text>
                  Are you sure you want to delete your account? This action cannot be undone.
                </Text>
                <Box bg="red.50" p={3} borderRadius="md" border="1px" borderColor="red.200">
                  <Text fontSize="sm" color="red.700" fontWeight="medium">
                    This will permanently delete:
                  </Text>
                  <Text fontSize="sm" color="red.600" mt={1}>
                    • Your account and profile
                  </Text>
                  <Text fontSize="sm" color="red.600">
                    • All your card collection data
                  </Text>
                  <Text fontSize="sm" color="red.600">
                    • Any decks you've created
                  </Text>
                </Box>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteAccountCancelRef} onClick={onDeleteAccountClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteAccount}
                ml={3}
                isLoading={isLoading}
                loadingText="Deleting..."
              >
                I understand, delete my account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
