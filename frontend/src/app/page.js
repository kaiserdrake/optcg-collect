'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { Box, Container, VStack, HStack, Text, Heading, Button, Spinner, useDisclosure } from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import Footer from '@/components/Footer';

// Lazy load the authenticated components
const CardSearch = lazy(() => import('@/components/CardSearch'));
const DeckBuilder = lazy(() => import('@/components/DeckBuilder'));
const MatchUpComponent = lazy(() => import('@/components/MatchUpComponent'));

export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();

  // Define your tabs configuration
  const tabs = [
    {
      label: 'MatchUp',
      badge: null,
      requiresAuth: false
    },
    {
      label: 'Collection',
      badge: null,
      requiresAuth: true
    },
    {
      label: 'Deck Builder',
      badge: null,
      requiresAuth: true
    }
  ];

  // Automatically close Login Modal if logged in
  useEffect(() => {

    if (user && isLoginOpen) {
      onLoginClose();
    }
  }, [user, isLoginOpen, onLoginClose])

  // Handle URL parameter for tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'collection') {
      setActiveTabIndex(1);
    } else if (tabParam === 'decks') {
      setActiveTabIndex(2);
    } else if (tabParam === 'matchup' || tabParam === 'hub' || !tabParam) {
      setActiveTabIndex(0); // MatchUp is now the default/main tab
    } else {
      setActiveTabIndex(0);
    }
  }, [searchParams]);

  const handleTabChange = (index) => {
    const selectedTab = tabs[index];

    // Check if the tab requires authentication
    if (selectedTab.requiresAuth && !user) {
      onLoginOpen();
      return;
    }

    setActiveTabIndex(index);
    // Update URL without causing a page reload
    let newUrl = '/';
    if (index === 1) {
      newUrl = '/?tab=collection';
    } else if (index === 2) {
      newUrl = '/?tab=decks';
    } else if (index === 0) {
      // For MatchUp, preserve deck parameters if they exist
      const deckParams = searchParams.getAll('deck');
      if (deckParams.length > 0) {
        const deckParamsString = deckParams.map(deck => `deck=${encodeURIComponent(deck)}`).join('&');
        newUrl = `/?tab=matchup&${deckParamsString}`;
      } else {
        newUrl = '/?tab=matchup';
      }
    }
    window.history.replaceState(null, '', newUrl);
  };

  // Show login required message for authenticated tabs
  const renderAuthRequiredContent = (tabName) => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" py={12}>
        <Heading size="lg" color="gray.600" mb={4}>
          {tabName}
        </Heading>
        <Text color="gray.500" fontSize="lg" mb={6}>
          Please sign in to access {tabName.toLowerCase()}.
        </Text>
        <Text color="gray.400" fontSize="sm">
          Click "Sign In" in the top navigation to continue
        </Text>
      </Box>
    </VStack>
  );

  return (
    <Box minH="100vh" bg="gray.50" display="flex" flexDirection="column">
      {/* Navbar is always visible */}
      <Navbar
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
        tabs={tabs}
      />

      {/* Main Content */}
      <Box as="main" pt={6} flex="1">
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            <Box
              bg="white"
              borderRadius="lg"
              shadow="sm"
              border="1px"
              borderColor="gray.200"
              overflow="hidden"
            >
              <Box p={6}>
                {/* MatchUp Tab - Always accessible, now serves as the main hub */}
                <Box display={activeTabIndex === 0 ? 'block' : 'none'}>
                  <Suspense fallback={<Box textAlign="center" py={8}><Spinner size="xl" /></Box>}>
                    <MatchUpComponent />
                  </Suspense>
                </Box>

                {/* Collection Tab - Keep CardSearch mounted to preserve state */}
                <Box display={activeTabIndex === 1 ? 'block' : 'none'}>
                  {user ? (
                    <Suspense fallback={<Box textAlign="center" py={8}><Spinner size="xl" /></Box>}>
                      <CardSearch mode="collection" />
                    </Suspense>
                  ) : (
                    renderAuthRequiredContent('Collection')
                  )}
                </Box>

                {/* Deck Builder Tab - Keep DeckBuilder mounted to preserve state */}
                <Box display={activeTabIndex === 2 ? 'block' : 'none'}>
                  {user ? (
                    <Suspense fallback={<Box textAlign="center" py={8}><Spinner size="xl" /></Box>}>
                      <DeckBuilder />
                    </Suspense>
                  ) : (
                    renderAuthRequiredContent('Deck Builder')
                  )}
                </Box>
              </Box>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={onLoginClose}
      />
    </Box>
  );
}
