'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ShortUrlPage() {
  const { code } = useParams();
  const router = useRouter();

  useEffect(() => {
    const resolveShortUrl = async () => {
      if (!code) {
        router.replace('/');
        return;
      }

      try {
        // The backend /s/:shortCode route will handle the redirect,
        // but we can also handle it client-side if needed
        window.location.href = `${api}/s/${code}`;

      } catch (error) {
        console.error('Error resolving short URL:', error);
        // Redirect to home page on error
        router.replace('/?tab=matchup');
      }
    };

    resolveShortUrl();
  }, [code, router]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >

      <VStack spacing={4}>
        <Spinner size="xl" color="blue.500" />
        <Text color="gray.600" fontSize="lg">
          Redirecting to your MatchUp...
        </Text>
      </VStack>
    </Box>
  );
}
