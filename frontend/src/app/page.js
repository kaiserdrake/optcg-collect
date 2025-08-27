'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Spinner, VStack } from '@chakra-ui/react';
import CardSearch from '@/components/CardSearch';
import ConnectionTest from '@/components/ConnectionTest';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <Container centerContent mt={20}><Spinner size="xl" /></Container>;
  }

  return (
    <Box>
      <Navbar />
      <main>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6} align="stretch">
            <CardSearch />
          </VStack>
        </Container>
      </main>
    </Box>
  );
}
