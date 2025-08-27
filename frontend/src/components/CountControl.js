'use client';

import { HStack, IconButton, Text, useToast } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useState } from 'react';

export default function CountControl({ cardId, type, count, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleUpdate = async (e, action) => {
    // This stops the click from affecting parent elements (like the card row)
    e.stopPropagation();

    setIsLoading(true);
    try {
      const res = await fetch(`${api}/api/collection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ card_id: cardId, type, action }),
      });

      const data = await res.json();
      if (res.ok) {
        onUpdate(cardId, data);
      } else {
        toast({ title: "Update Failed", description: data.message, status: "error", duration: 3000, isClosable: true });
      }
    } catch (err) {
      toast({ title: "Network Error", description: "Could not connect to server.", status: "error", duration: 3000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HStack>
      <IconButton
        aria-label={`Decrement ${type} count`}
        icon={<ChevronLeftIcon />}
        size="xs"
        // Pass the event object 'e' to the handler
        onClick={(e) => handleUpdate(e, 'decrement')}
        isDisabled={count <= 0 || isLoading}
      />
      <Text w="2.5rem" textAlign="center" fontWeight="bold" fontSize="lg">{count}</Text>
      <IconButton
        aria-label={`Increment ${type} count`}
        icon={<ChevronRightIcon />}
        size="xs"
        // Pass the event object 'e' to the handler
        onClick={(e) => handleUpdate(e, 'increment')}
        isDisabled={count >= 99 || isLoading}
      />
    </HStack>
  );
}
