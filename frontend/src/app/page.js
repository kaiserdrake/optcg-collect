// frontend/src/app/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Badge,
  Spinner,
  Heading,
  Text,
  useBreakpointValue
} from '@chakra-ui/react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MatchUpComponent from '@/components/MatchUpComponent';
import CardSearch from '@/components/CardSearch';
import DeckBuilder from '@/components/DeckBuilder';

export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get initial tab from URL
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'collection') return 1;
    if (tabParam === 'decks') return 2;
    return 0; // Default to MatchUp
  };

  const [activeTabIndex, setActiveTabIndex] = useState(getInitialTab);

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTabIndex(getInitialTab());
  }, [searchParams]);

  // Define tab configuration
  const tabs = [
    { label: 'MatchUp', badge: null },
    { label: 'Collection', badge: null },
    { label: 'Deck Builder', badge: null }
  ];

  const handleTabChange = (index) => {
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
      <Box textAlign="center" py={{ base: 6, md: 12 }}>
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

  // Mobile-specific responsive values
  const containerMaxW = useBreakpointValue({ base: "100%", sm: "container.xl" });
  const containerPx = useBreakpointValue({ base: 2, sm: 6 });
  const mainPt = useBreakpointValue({ base: 2, md: 6 });
  const contentSpacing = useBreakpointValue({ base: 2, md: 6 });
  const boxPadding = useBreakpointValue({ base: 2, sm: 4, md: 6 });
  const boxBorderRadius = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box minH="100vh" bg="gray.50" display="flex" flexDirection="column">
      {/* Navbar is always visible */}
      <Navbar
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
        tabs={tabs}
      />

      {/* Main Content - Optimized for mobile */}
      <Box as="main" pt={mainPt} flex="1">
        <Container maxW={containerMaxW} px={containerPx}>
          <VStack spacing={contentSpacing} align="stretch">
            <Box
              bg="white"
              borderRadius={boxBorderRadius}
              shadow={{ base: "none", sm: "sm" }}
              border="none"
              overflow="hidden"
            >
              <Box p={boxPadding}>
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

      {/* Footer - Always visible */}
      <Footer />
    </Box>
  );
}
