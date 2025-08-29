'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Spinner, Text, VStack } from '@chakra-ui/react';

export default function DeckBuilder() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main page with deck builder tab active
    // We'll use a URL parameter to indicate which tab should be active
    router.push('/?tab=decks');
  }, [router]);

  return (
    <Container py={8}>
      <VStack spacing={4}>
        <Spinner size="lg" />
        <Text>Redirecting to Deck Builder...</Text>
      </VStack>
    </Container>
  );
}
