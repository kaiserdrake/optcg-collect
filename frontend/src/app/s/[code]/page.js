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
      console.log('[ShortURL] Starting short URL resolution');
      console.log('[ShortURL] Short code:', code);

      if (!code) {
        console.log('[ShortURL] No code provided, redirecting to home');
        router.replace('/');
        return;
      }

      try {
        // Check if API is on the same origin
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const apiUrl = new URL(api);
        const isSameOrigin = apiUrl.origin === currentOrigin;

        console.log('[ShortURL] Environment detection:');
        console.log('  - Current origin:', currentOrigin);
        console.log('  - API URL:', api);
        console.log('  - API origin:', apiUrl.origin);
        console.log('  - Same origin?', isSameOrigin);

        if (isSameOrigin) {
          // Same origin: Use direct backend redirect (works reliably)
          const redirectUrl = `${api}/s/${code}`;
          console.log('[ShortURL] Same-origin detected, using direct backend redirect');
          console.log('[ShortURL] Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        } else {
          // Different origin: Fetch the URL first, then redirect client-side
          console.log('[ShortURL] Cross-origin detected, fetching URL from stats endpoint');

          const statsUrl = `${api}/api/short-url/${code}/stats`;
          console.log('[ShortURL] Fetching from:', statsUrl);

          const response = await fetch(statsUrl);
          console.log('[ShortURL] Response status:', response.status, response.statusText);

          if (!response.ok) {
            throw new Error(`Short URL not found (HTTP ${response.status})`);
          }

          const data = await response.json();
          console.log('[ShortURL] Retrieved data:', data);

          const originalUrl = data.original_url;
          console.log('[ShortURL] Original URL:', originalUrl);

          // Parse the original URL to extract the path and query params
          const url = new URL(originalUrl);
          const targetPath = url.pathname + url.search;
          console.log('[ShortURL] Target path:', targetPath);

          // Redirect to the target path using Next.js router
          console.log('[ShortURL] Redirecting via Next.js router');
          router.replace(targetPath);
        }

      } catch (error) {
        console.error('[ShortURL] Error resolving short URL:', error);
        console.error('[ShortURL] Error name:', error.name);
        console.error('[ShortURL] Error message:', error.message);
        console.error('[ShortURL] Error stack:', error.stack);
        console.log('[ShortURL] Redirecting to home page with matchup tab');

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
