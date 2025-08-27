'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Box, Button, Container, FormControl, FormLabel, Input, Heading, Stack, useToast
} from '@chakra-ui/react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await login(username, password);
        if (!result.success) {
            toast({
                title: "Login Failed",
                description: result.message || "Please check your credentials.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
        setIsLoading(false);
    };

    return (
        <Container centerContent>
            <Box
                mt={20}
                p={8}
                borderWidth={1}
                borderRadius="lg"
                boxShadow="lg"
                width="100%"
                maxWidth="400px"
            >
                <Heading mb={6} textAlign="center">Login</Heading>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        <FormControl id="username">
                            <FormLabel>Username or Email</FormLabel>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </FormControl>
                        <FormControl id="password">
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </FormControl>
                        <Button
                            type="submit"
                            colorScheme="blue"
                            isLoading={isLoading}
                        >
                            Log In
                        </Button>
                    </Stack>
                </form>
            </Box>
        </Container>
    );
}
