// Create this file as frontend/src/app/match/page.js

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MatchPage() {
  const router = useRouter();

  useEffect(() => {
    // Extract search params and redirect to main page with matchup tab
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);

    // Extract deck parameters if they exist from pathname
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Check if there are deck parameters in the URL path (format: /match;deck=...;deck=...)
    if (pathname.includes(';')) {
      const pathParts = pathname.split(';');
      const deckParams = pathParts.filter(part => part.startsWith('deck='));

      if (deckParams.length > 0) {
        // Extract deck content and redirect with proper query parameters
        const queryParams = new URLSearchParams();
        queryParams.set('tab', 'matchup');

        deckParams.forEach(deckParam => {
          const deckContent = decodeURIComponent(deckParam.substring(5)); // Remove 'deck='
          queryParams.append('deck', deckContent);
        });

        const redirectUrl = `/?${queryParams.toString()}`;
        router.replace(redirectUrl);
        return;
      }
    }

    // Check for deck parameters in search params
    const deckParams = searchParams.getAll('deck');
    if (deckParams.length > 0) {
      const queryParams = new URLSearchParams();
      queryParams.set('tab', 'matchup');

      deckParams.forEach(deck => {
        queryParams.append('deck', deck);
      });

      const redirectUrl = `/?${queryParams.toString()}`;
      router.replace(redirectUrl);
    } else {
      // No parameters - just redirect to matchup tab
      router.replace('/?tab=matchup');
    }
  }, [router]);

  return null; // This component just redirects
}
