'use client';

import { useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
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
import { FiSettings, FiUser, FiLock, FiTrash2, FiEdit } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();

  // Alias change state
  const [newAlias, setNewAlias] = useState('');
  const [aliasError, setAliasError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Delete account dialog state
  const { isOpen: isDeleteAccountOpen, onOpen: onDeleteAccountOpen, onClose: onDeleteAccountClose } = useDisclosure();
  const deleteAccountCancelRef = useRef();

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const passwordsMatch = newPassword === confirmPassword;
  const isNewPasswordValid = newPassword.length >= 8;

  const handleAliasChange = async (e) => {
    e.preventDefault();

    if (!newAlias.trim()) {
      setAliasError('Alias is required');
      return;
    }

    if (newAlias.trim().length > 255) {
      setAliasError('Alias must be 255 characters or less');
      return;
    }

    // Don't allow admin user (ID = 1) to change alias
    if (user.id === 1) {
      setAliasError('Cannot change alias of the default admin account');
      return;
    }

    setIsLoading(true);
    setAliasError('');

    try {
      const res = await fetch(`${api}/api/users/me/alias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ alias: newAlias.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Alias Updated',
          description: data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Update user context with new alias
        if (updateUser) {
          updateUser({ ...user, alias: newAlias.trim() });
        }

        setNewAlias('');
      } else {
        setAliasError(data.message || 'Failed to update alias');
      }
    } catch (error) {
      setAliasError('Could not connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
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
        toast({
          title: 'Error',
          description: data.message,
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
        toast({
          title: 'Error',
          description: data.message,
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
      setIsLoading(false);
      onDeleteAccountClose();
    }
  };

  const handleModalClose = () => {
    // Clear form data when closing
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewAlias('');
    setAliasError('');
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
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
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
                    <Text fontWeight="medium">Alias:</Text>
                    <Text>{user.alias || 'Not set'}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Role:</Text>
                    <Tag colorScheme={user.role === 'Admin' ? 'purple' : 'blue'} size="sm">
                      {user.role}
                    </Tag>
                  </HStack>
                </VStack>
              </Box>

              <Divider />

              {/* Change Alias Section - Hidden for initial admin */}
              {user.id !== 1 && (
                <>
                  <Box>
                    <HStack spacing={3} mb={4}>
                      <FiEdit />
                      <Heading size="md">Change Alias</Heading>
                    </HStack>

                    <form onSubmit={handleAliasChange}>
                      <Stack spacing={4}>
                        <FormControl isRequired isInvalid={!!aliasError}>
                          <FormLabel>New Alias</FormLabel>
                          <Input
                            type="text"
                            value={newAlias}
                            onChange={(e) => {
                              setNewAlias(e.target.value);
                              setAliasError('');
                            }}
                            placeholder={user.alias || "Enter your alias"}
                            isDisabled={isLoading}
                          />
                          {aliasError && (
                            <FormErrorMessage>{aliasError}</FormErrorMessage>
                          )}
                          <FormHelperText>
                            Your alias is used when publishing decks and can be seen by other users.
                          </FormHelperText>
                        </FormControl>

                        <Button
                          type="submit"
                          colorScheme="blue"
                          isLoading={isLoading}
                          isDisabled={!newAlias.trim() || newAlias.trim() === user.alias}
                          loadingText="Updating..."
                        >
                          Update Alias
                        </Button>
                      </Stack>
                    </form>
                  </Box>

                  <Divider />
                </>
              )}

              {/* Password Change Section - Hidden for initial admin */}
              {user.id !== 1 && (
                <>
                  <Box>
                    <HStack spacing={3} mb={4}>
                      <FiLock />
                      <Heading size="md">Change Password</Heading>
                    </HStack>

                    <form onSubmit={handlePasswordChange}>
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
                          {newPassword.length > 0 && !isNewPasswordValid && (
                            <FormErrorMessage>Password must be at least 8 characters long.</FormErrorMessage>
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
                          {confirmPassword.length > 0 && !passwordsMatch && (
                            <FormErrorMessage>Passwords do not match.</FormErrorMessage>
                          )}
                          <FormHelperText>
                            Password must be at least 8 characters long.
                          </FormHelperText>
                        </FormControl>

                        <Button
                          type="submit"
                          colorScheme="orange"
                          isLoading={isLoading}
                          isDisabled={!currentPassword || !passwordsMatch || !isNewPasswordValid}
                          loadingText="Updating..."
                        >
                          Update Password
                        </Button>
                      </Stack>
                    </form>
                  </Box>

                  <Divider />

                  {/* Danger Zone - Also hidden for initial admin */}
                  <Box borderWidth={1} borderColor="red.200" borderRadius="md" p={4}>
                    <HStack spacing={3} mb={4}>
                      <FiTrash2 color="red" />
                      <Heading size="md" color="red.600">Danger Zone</Heading>
                    </HStack>
                    <Text mb={4} color="gray.600">
                      Once you delete your account, there is no going back. This will permanently delete your account and all associated data.
                    </Text>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      onClick={onDeleteAccountOpen}
                      isDisabled={isLoading}
                    >
                      Delete Account
                    </Button>
                  </Box>
                </>
              )}

              {/* Message for initial admin */}
              {user.id === 1 && (
                <Box p={4} bg="blue.50" borderRadius="md" textAlign="center">
                  <Text color="blue.700" fontWeight="medium">
                    As the initial administrator account, certain settings are restricted for security purposes.
                  </Text>
                  <Text color="blue.600" fontSize="sm" mt={2}>
                    Contact your system administrator if you need to modify these settings.
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Account Confirmation Dialog */}
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
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data, including your collection and decks.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteAccountCancelRef} onClick={onDeleteAccountClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteAccount} ml={3} isLoading={isLoading}>
                Delete Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
