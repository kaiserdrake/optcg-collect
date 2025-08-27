'use client';

import { useEffect } from 'react';
import { Box, Container, Spinner } from '@chakra-ui/react';
import CardSearch from '@/components/CardSearch';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
          <CardSearch />
        </Container>
      </main>
    </Box>
  );
}
