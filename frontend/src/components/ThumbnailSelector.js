'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Grid,
  Box,
  Text,
  VStack
} from '@chakra-ui/react';
import CardImage from './CardImage';

const ThumbnailSelector = ({ isOpen, onClose, cards, onSelect }) => {
  // Remove duplicates based on card_code and get unique cards
  const uniqueCards = cards.reduce((acc, card) => {
    if (!acc.find(c => c.card_code === card.card_code)) {
      acc.push(card);
    }
    return acc;
  }, []);

  const handleCardSelect = (card) => {
    onSelect(card);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Deck Thumbnail</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {uniqueCards.length === 0 ? (
            <VStack spacing={4} py={8}>
              <Text color="gray.500" fontSize="lg">
                No cards in deck
              </Text>
              <Text color="gray.400" fontSize="sm">
                Add cards to your deck first to select a thumbnail
              </Text>
            </VStack>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={2}>
              {uniqueCards.map((card) => (
                <Box
                  key={card.card_code}
                  onClick={() => handleCardSelect(card)}
                  cursor="pointer"
                  _hover={{ transform: 'scale(1.05)' }}
                  transition="transform 0.2s"
                  position="relative"
                  display="flex"
                  justifyContent="center"
                >
                  <Box
                    width="80px"
                    height="80px"
                    borderRadius="md"
                    border="2px"
                    borderColor="transparent"
                    _hover={{ borderColor: 'blue.400' }}
                    transition="border-color 0.2s"
                    overflow="hidden"
                    position="relative"
                    bg="white"
                  >
                    <CardImage
                      src={card.img_url}
                      alt={card.name}
                      width="160px"  // 2x the container width for zoom
                      height="224px" // 2x the proportional height (80px * 2.8 aspect ratio)
                      objectFit="cover"
                      position="absolute"
                      top="-20px"
                      left="-40px"
                    />
                  </Box>
                </Box>
              ))}
            </Grid>
          )}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ThumbnailSelector;
