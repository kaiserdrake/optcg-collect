'use client';

import { useEffect, useState } from 'react';
import { Box, Container, VStack, Heading, Text } from '@chakra-ui/react';
import CardSearch from '@/components/CardSearch';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Define your tabs configuration
  const tabs = [
    {
      label: 'Collection',
      badge: null // Could add a count here later
    },
    {
      label: 'Deck Builder',
      badge: 'Soon'
    },
    // Add more tabs as needed
    // {
    //   label: 'Trading',
    //   badge: 'New'
    // }
  ];

  // Handle URL parameter for tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'decks') {
      setActiveTabIndex(1);
    } else if (tabParam === 'trading') {
      setActiveTabIndex(2);
    } else {
      setActiveTabIndex(0);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleTabChange = (index) => {
    setActiveTabIndex(index);
    // Update URL without causing a page reload
    let newUrl = '/';
    if (index === 1) {
      newUrl = '/?tab=decks';
    } else if (index === 2) {
      newUrl = '/?tab=trading';
    }
    window.history.replaceState(null, '', newUrl);
  };

  const renderTabContent = () => {
    switch (activeTabIndex) {
      case 0:
        return <CardSearch />;
      case 1:
        return (
          <VStack spacing={6} align="stretch">
            <Box textAlign="center" py={12}>
              <Heading size="lg" color="gray.600" mb={4}>
                Deck Builder
              </Heading>
              <Text color="gray.500" fontSize="lg">
                This feature is coming soon!
              </Text>
              <Text color="gray.400" fontSize="sm" mt={2}>
                Build and manage your custom decks with advanced filtering and optimization tools.
              </Text>
            </Box>
          </VStack>
        );
      case 2:
        return (
          <VStack spacing={6} align="stretch">
            <Box textAlign="center" py={12}>
              <Heading size="lg" color="gray.600" mb={4}>
                Trading Hub
              </Heading>
              <Text color="gray.500" fontSize="lg">
                Trading features coming soon!
              </Text>
              <Text color="gray.400" fontSize="sm" mt={2}>
                Connect with other players to trade cards and complete your collection.
              </Text>
            </Box>
          </VStack>
        );
      default:
        return <CardSearch />;
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
        tabs={tabs}
      />

      {/* Main Content */}
      <Box as="main" pt={6}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            {/* Content area with subtle background */}
            <Box
              bg="white"
              borderRadius="lg"
              shadow="sm"
              border="1px"
              borderColor="gray.200"
              overflow="hidden"
            >
              <Box p={6}>
                {renderTabContent()}
              </Box>
            </Box>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
