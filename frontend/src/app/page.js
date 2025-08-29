'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Spinner, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text } from '@chakra-ui/react';
import CardSearch from '@/components/CardSearch';
import ConnectionTest from '@/components/ConnectionTest';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDebug, setShowDebug] = useState(true);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Handle URL parameter for tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'decks') {
      setActiveTabIndex(1);
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
    const newUrl = index === 1 ? '/?tab=decks' : '/';
    window.history.replaceState(null, '', newUrl);
  };

  return (
    <Box>
      <Navbar />
      <main>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6} align="stretch">
            <Tabs index={activeTabIndex} onChange={handleTabChange} variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Collection</Tab>
                <Tab>Deck Builder</Tab>
              </TabList>

              <TabPanels>
                {/* Collection Tab */}
                <TabPanel px={0} py={6}>
                  <CardSearch />
                </TabPanel>

                {/* Deck Builder Tab */}
                <TabPanel px={0} py={6}>
                  <VStack spacing={4} align="stretch">
                    <Heading>Deck Builder</Heading>
                    <Text>This feature is coming soon!</Text>
                    {/* Future deck builder content will go here */}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
      </main>
    </Box>
  );
}
