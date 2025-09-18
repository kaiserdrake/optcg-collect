'use client';

import { HStack, IconButton, Text, useToast, Tooltip } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useState } from 'react';

export default function CountControl({ cardId, type, count, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleUpdate = async (e, action) => {
    // This stops the click from affecting parent elements (like the card row)
    e.stopPropagation();
    e.preventDefault();

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
        // Pass the new counts to the parent component
        onUpdate(cardId, data);

        // Provide user feedback
        const actionText = action === 'increment' ? 'Added' : 'Removed';
        const typeText = type === 'proxy' ? 'proxy' : 'owned card';

        // No need toast here
      } else {
        toast({
          title: "Update Failed",
          description: data.message,
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not connect to server.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const decrementDisabled = count <= 0 || isLoading;
  const incrementDisabled = count >= 99 || isLoading;

  const typeLabel = type === 'proxy' ? 'proxy' : 'owned';

  return (
    <HStack spacing={1} role="group" aria-label={`${typeLabel} card count controls`}>
      <Tooltip
        label={decrementDisabled ? 'Cannot go below 0' : `Remove from ${typeLabel}`}
        isDisabled={isLoading}
      >
        <IconButton
          aria-label={`Decrease ${typeLabel} count`}
          icon={<ChevronLeftIcon />}
          size="xs"
          variant="ghost"
          onClick={(e) => handleUpdate(e, 'decrement')}
          isDisabled={decrementDisabled}
          isLoading={isLoading && count > 0}
          _hover={{ bg: 'red.100' }}
          _active={{ bg: 'red.200' }}
        />
      </Tooltip>

      <Text
        w="2.5rem"
        textAlign="center"
        fontWeight="bold"
        fontSize="lg"
        role="status"
        aria-live="polite"
        aria-label={`${count} ${typeLabel} cards`}
      >
        {count}
      </Text>

      <Tooltip
        label={incrementDisabled ? 'Maximum 99 cards' : `Add to ${typeLabel}`}
        isDisabled={isLoading}
      >
        <IconButton
          aria-label={`Increase ${typeLabel} count`}
          icon={<ChevronRightIcon />}
          size="xs"
          variant="ghost"
          onClick={(e) => handleUpdate(e, 'increment')}
          isDisabled={incrementDisabled}
          isLoading={isLoading && count < 99}
          _hover={{ bg: 'green.100' }}
          _active={{ bg: 'green.200' }}
        />
      </Tooltip>
    </HStack>
  );
}
