'use client';

import { useState, useRef } from 'react';
import {
    Container, Heading, VStack, FormControl, FormLabel, Input, Button, useToast,
    Box, Stack, FormHelperText, FormErrorMessage, Text, useDisclosure,
    AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cancelRef = useRef();
    const { user, logout } = useAuth();

    const passwordsMatch = newPassword === confirmPassword;
    const isNewPasswordValid = newPassword.length >= 8;

    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                    title: 'Success',
                    description: data.message,
                    status: 'success',
                    duration: 5000,
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
                    isClosable: true,
                });
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
                 toast({ title: 'Error', description: data.message, status: 'error', duration: 5000, isClosable: true, });
            }
        } catch (error) {
            toast({ title: 'Network Error', description: "Could not connect to server.", status: 'error', duration: 5000, isClosable: true });
        } finally {
            setIsLoading(false);
            onClose();
        }
    };

    if (!user) return null;

    return (
        <>
            <Navbar />
            <Container py={8}>
                <VStack spacing={12} align="stretch">
                    <Box>
                        <Heading>Account Settings</Heading>
                        <Text>Welcome, {user.name} ({user.email})</Text>
                    </Box>

                    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="md">
                        <Stack spacing={4} p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
                            <Heading size="md">Change Password</Heading>
                            <FormControl isRequired>
                                <FormLabel>Current Password</FormLabel>
                                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                            </FormControl>
                            <FormControl isRequired isInvalid={newPassword.length > 0 && !isNewPasswordValid}>
                                <FormLabel>New Password</FormLabel>
                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                {newPassword.length > 0 && !isNewPasswordValid ? (
                                    <FormErrorMessage>Password must be at least 8 characters long.</FormErrorMessage>
                                ) : (
                                    <FormHelperText>Must be at least 8 characters long.</FormHelperText>
                                )}
                            </FormControl>
                            <FormControl isRequired isInvalid={confirmPassword.length > 0 && !passwordsMatch}>
                                <FormLabel>Confirm New Password</FormLabel>
                                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                {confirmPassword.length > 0 && !passwordsMatch && (
                                    <FormErrorMessage>Passwords do not match.</FormErrorMessage>
                                )}
                            </FormControl>
                            <Button
                                type="submit"
                                colorScheme="blue"
                                isLoading={isLoading}
                                isDisabled={!currentPassword || !newPassword || !confirmPassword || !passwordsMatch || !isNewPasswordValid}
                            >
                                Update Password
                            </Button>
                        </Stack>
                    </Box>

                    <Box>
                        <Heading size="md" color="red.600">Danger Zone</Heading>
                        <Stack spacing={4} p={8} mt={4} borderWidth={1} borderRadius="lg" boxShadow="lg" borderColor="red.300">
                            <Heading size="sm">Delete Account</Heading>
                            <Text>Once you delete your account, there is no going back. All of your data, including your entire card collection, will be permanently removed. Please be certain.</Text>
                            <Box>
                                <Button colorScheme="red" onClick={onOpen}>Delete My Account</Button>
                            </Box>
                        </Stack>
                    </Box>
                </VStack>
            </Container>

            <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete Account</AlertDialogHeader>
                        <AlertDialogBody>
                            Are you absolutely sure? This will permanently delete your account and all of your collection data. This action cannot be undone.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
                            <Button colorScheme="red" onClick={handleDeleteAccount} ml={3} isLoading={isLoading}>
                                I understand, delete my account
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}
