'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Box, Button, Container, FormControl, FormLabel, Input, Heading, Stack,
    useToast, FormErrorMessage, InputGroup, InputRightElement, IconButton,
    Text, Alert, AlertIcon, Fade, Spinner
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useRouter, useSearchParams } from 'next/navigation';

// Separate component that uses useSearchParams
const LoginForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [loginAttempts, setLoginAttempts] = useState(0);

    const { login, user } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectTo = searchParams.get('redirect') || '/';
            router.push(redirectTo);
        }
    }, [user, router, searchParams]);

    const validateForm = () => {
        const newErrors = {};

        if (!username.trim()) {
            newErrors.username = 'Username or email is required';
        } else if (username.trim().length < 2) {
            newErrors.username = 'Username must be at least 2 characters';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const result = await login(username.trim(), password);

            if (result.success) {
                toast({
                    title: "Login Successful",
                    description: "Welcome back!",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                });

                // Reset form and attempts on success
                setLoginAttempts(0);
                setUsername('');
                setPassword('');
            } else {
                setLoginAttempts(prev => prev + 1);

                // Show different messages based on attempt count
                let errorMessage = result.message || "Please check your credentials.";
                if (loginAttempts >= 2) {
                    errorMessage += " Make sure your username/email and password are correct.";
                }

                toast({
                    title: "Login Failed",
                    description: errorMessage,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });

                // Clear password on failed attempt for security
                setPassword('');
            }
        } catch (error) {
            toast({
                title: "Connection Error",
                description: "Unable to connect to the server. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        if (field === 'username') {
            setUsername(value);
            if (errors.username) {
                setErrors(prev => ({ ...prev, username: null }));
            }
        } else if (field === 'password') {
            setPassword(value);
            if (errors.password) {
                setErrors(prev => ({ ...prev, password: null }));
            }
        }
    };

    // Don't render if user is already logged in
    if (user) {
        return null;
    }

    const isRateLimited = loginAttempts >= 5;

    return (
        <Box
            mt={20}
            p={8}
            borderWidth={1}
            borderRadius="lg"
            boxShadow="lg"
            width="100%"
            maxWidth="400px"
            bg="white"
        >
            <Heading mb={6} textAlign="center" color="gray.700">
                Sign In
            </Heading>

            {loginAttempts >= 3 && loginAttempts < 5 && (
                <Fade in={true}>
                    <Alert status="warning" mb={4} borderRadius="md">
                        <AlertIcon />
                        <Text fontSize="sm">
                            Multiple failed attempts detected. Please double-check your credentials.
                        </Text>
                    </Alert>
                </Fade>
            )}

            {isRateLimited && (
                <Alert status="error" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                        Too many failed attempts. Please wait a moment before trying again.
                    </Text>
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                    <FormControl id="username" isInvalid={!!errors.username} isRequired>
                        <FormLabel>Username or Email</FormLabel>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            placeholder="Enter your username or email"
                            autoComplete="username"
                            isDisabled={isLoading || isRateLimited}
                            _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #4299e1' }}
                        />
                        <FormErrorMessage>{errors.username}</FormErrorMessage>
                    </FormControl>

                    <FormControl id="password" isInvalid={!!errors.password} isRequired>
                        <FormLabel>Password</FormLabel>
                        <InputGroup>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                isDisabled={isLoading || isRateLimited}
                                _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #4299e1' }}
                            />
                            <InputRightElement>
                                <IconButton
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPassword(!showPassword)}
                                    isDisabled={isLoading}
                                    tabIndex={-1}
                                />
                            </InputRightElement>
                        </InputGroup>
                        <FormErrorMessage>{errors.password}</FormErrorMessage>
                    </FormControl>

                    <Button
                        type="submit"
                        colorScheme="blue"
                        size="lg"
                        isLoading={isLoading}
                        isDisabled={isRateLimited}
                        loadingText="Signing in..."
                        _hover={{ bg: 'blue.600' }}
                        _active={{ bg: 'blue.700' }}
                    >
                        Sign In
                    </Button>
                </Stack>
            </form>

            {loginAttempts > 0 && !isRateLimited && (
                <Text fontSize="xs" color="gray.500" mt={4} textAlign="center">
                    Login attempts: {loginAttempts}/5
                </Text>
            )}
        </Box>
    );
};

// Loading fallback component
const LoginPageFallback = () => (
    <Container centerContent>
        <Box
            mt={20}
            p={8}
            borderWidth={1}
            borderRadius="lg"
            boxShadow="lg"
            width="100%"
            maxWidth="400px"
            bg="white"
            display="flex"
            justifyContent="center"
            alignItems="center"
            minH="400px"
        >
            <Spinner size="xl" color="blue.500" />
        </Box>
    </Container>
);

// Main component with Suspense boundary
export default function LoginPage() {
    return (
        <Container centerContent>
            <Suspense fallback={<LoginPageFallback />}>
                <LoginForm />
            </Suspense>
        </Container>
    );
}
