'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DecksPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main page with deck builder tab
    router.replace('/?tab=decks');
  }, [router]);

  return null; // This component just redirects
}
