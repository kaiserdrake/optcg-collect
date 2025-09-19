'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  Grid,
  GridItem,
  useDisclosure,
  Spinner,
  Text,

  HStack,
  Input,
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast
} from '@chakra-ui/react';

import CardSearch from './CardSearch';
import CardDetailModal from './CardDetailModal';
import ThumbnailSelector from './ThumbnailSelector';
import SaveDeckModal from './SaveDeckModal';
import LoadDeckModal from './LoadDeckModal';
import LocateModal from './LocateModal';
import PublishConfirmationModal from './PublishConfirmationModal';

import DeckHeader from './DeckHeader';
import DeckCanvas from './DeckCanvas';
import ImportDeckModal from './ImportDeckModal';

import { useDeckBuilder } from '../hooks/useDeckBuilder';
import { useAuth } from '../context/AuthContext';

export default function DeckBuilder() {
  const toast = useToast();
  const { user } = useAuth();

  const {

    // State
    deck,
    isClient,
    sortMode,
    sortReverse,
    deleteConfirmationDeck,
    deleteInputValue,
    selectedCardForDetail,
    searchKeyword,

    // Setters
    setSortMode,
    setSortReverse,
    setDeleteInputValue,
    updateDeckName,
    updateDeck,
    updateSearchKeyword,
    setDeck,

    // Computed values
    stats,
    sortedCards,


    // Functions
    addCardToDeck,
    removeCardFromDeck,
    handleThumbnailClick,
    handleThumbnailSelect,
    handleCardClick,
    clearDeck,
    shareDeckList,
    handleDeleteDeck,
    confirmDeleteDeck,
    handleLoadDeck,

    handleSaveDeck, // This is the internal save function - NOT for SaveDeckModal callback
  } = useDeckBuilder();

  // Disclosure hooks
  const { isOpen: isThumbnailOpen, onOpen: onThumbnailOpen, onClose: onThumbnailClose } = useDisclosure();
  const { isOpen: isSaveOpen, onOpen: onSaveOpen, onClose: onSaveClose } = useDisclosure();
  const { isOpen: isLoadOpen, onOpen: onLoadOpen, onClose: onLoadClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isCardDetailOpen, onOpen: onCardDetailOpen, onClose: onCardDetailClose } = useDisclosure();
  const { isOpen: isLocateOpen, onOpen: onLocateOpen, onClose: onLocateClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isPublishConfirmOpen, onOpen: onPublishConfirmOpen, onClose: onPublishConfirmClose } = useDisclosure();

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  // SAFE helper function to get card data
  const getCardData = (item) => {
    return item.card || item;
  };

  // Handler wrappers to connect hook functions with modal disclosure
  const handleThumbnailClickWrapper = () => {
    handleThumbnailClick(onThumbnailOpen);
  };

  const handleThumbnailSelectWrapper = (card) => {
    handleThumbnailSelect(card, onThumbnailClose);
  };

  const handleDeleteDeckWrapper = (deckId, deckName) => {
    handleDeleteDeck(deckId, deckName, onDeleteOpen);
  };

  // Handle card click to open detail modal
  const handleCardClickWrapper = (card) => {
    handleCardClick(card, onCardDetailOpen);
  };

  // Import deck function
  const handleImportDeck = () => {
    onImportOpen();
  };

  // LoadDeckModal callback - replaces the entire deck
  const handleLoadSuccess = (loadedDeckData) => {
    // For loading, we DO want to replace the entire deck
    setDeck(loadedDeckData);
  };

  // SaveDeckModal callback - ONLY updates metadata, preserves cards on canvas
  const handleSaveSuccess = (savedDeckData) => {
    // Only update the deck metadata, do NOT touch the cards array
    // This preserves the cards exactly as they are on the canvas
    setDeck(prevDeck => ({
      ...prevDeck, // Keep all existing deck data including cards
      id: savedDeckData.id, // Update the deck ID (for new saves)
      name: savedDeckData.name, // Update name if changed
      thumbnail: savedDeckData.thumbnail, // Update thumbnail if changed
      location: savedDeckData.location, // Update location if changed
      created_at: savedDeckData.created_at, // Update timestamps
      updated_at: savedDeckData.updated_at
      // DO NOT update cards - keep the existing cards array intact
    }));
  };

  // Import result handler
  const handleImportResult = (importedCards) => {
    // importedCards is an array of { card, count } objects from ImportDeckModal
    // We need to add these cards to the current deck
    setDeck(prevDeck => ({
      ...prevDeck,
      cards: [...prevDeck.cards, ...importedCards]
    }));
  };


  // Publish deck function
  const handlePublishDeck = () => {
    // Check if deck has a leader instead of checking if it's saved
    if (!stats.hasLeader) {
      toast({
        title: 'Cannot publish',
        description: 'Deck must have a leader before publishing',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check if deck has cards
    if (!deck.cards || deck.cards.length === 0) {
      toast({
        title: 'Cannot publish',
        description: 'Add cards to your deck before publishing',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Open confirmation modal instead of publishing directly
    onPublishConfirmOpen();
  };

  // Handle the actual publishing after confirmation
  const handleConfirmPublish = async (editedDeckName) => {
    setIsPublishing(true);

    try {
      // Create deck data with the potentially modified name
      const deckDataToPublish = {
        ...deck,
        name: editedDeckName || deck.name // Use edited name if provided, otherwise fallback to original
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/decks/publish-current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        credentials: 'include',
        body: JSON.stringify({ deckData: deckDataToPublish }),
      });

      if (response.ok) {
        toast({
          title: 'Deck published',
          description: `"${editedDeckName || deck.name}" has been published to the public gallery`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onPublishConfirmClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to publish deck');
      }
    } catch (error) {
      console.error('Publish deck error:', error);
      toast({
        title: 'Publish failed',
        description: error.message || 'Could not publish the deck. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Refresh card in deck after detail modal updates
  const handleRefreshCardInDeck = (updatedCard) => {
    // This function can be used to refresh a card in the deck after it's been updated
    // Currently not implemented as the deck cards are separate from search results
    console.log('Card refreshed:', updatedCard);
  };

  if (!isClient) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />

          <Text color="gray.600">Loading Deck Builder...</Text>
        </VStack>
      </Box>

    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header Section */}
      <DeckHeader
        deck={deck}
        stats={stats}
        onThumbnailClick={handleThumbnailClickWrapper}
        onNameChange={updateDeckName}
        onClearDeck={clearDeck}
        onLoadDeck={onLoadOpen}
        onSaveDeck={onSaveOpen}
        onDeleteDeck={handleDeleteDeckWrapper}
        onShareDeckList={shareDeckList}
        onImportDeck={handleImportDeck}
        onPublishDeck={handlePublishDeck}
        onLocateDeck={onLocateOpen}
      />

      {/* Main Content: Canvas and Cards */}
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        gap={6}
        minH="600px"
      >
        <GridItem>
          <DeckCanvas
            deck={deck}
            stats={stats}
            sortedCards={sortedCards}
            sortMode={sortMode}
            sortReverse={sortReverse}
            setSortMode={setSortMode}
            setSortReverse={setSortReverse}

            onCardClick={handleCardClickWrapper}
            onRemoveCard={removeCardFromDeck}
            onAddCard={addCardToDeck}
          />
        </GridItem>

        <GridItem>
          <CardSearch
            mode="deckbuilder"
            onCardClick={addCardToDeck}
            showFilters={true}
            searchKeyword={searchKeyword}
            onSearchKeywordChange={updateSearchKeyword}
          />
        </GridItem>
      </Grid>

      {/* Modals */}
      <ThumbnailSelector
        isOpen={isThumbnailOpen}
        onClose={onThumbnailClose}
        onSelect={handleThumbnailSelectWrapper}
        currentThumbnail={deck.thumbnail}
        cards={deck.cards.map(item => {
          // SAFE card data extraction for ThumbnailSelector
          const cardData = getCardData(item);
          return cardData;
        })}
      />

      <SaveDeckModal
        isOpen={isSaveOpen}
        onClose={onSaveClose}
        deck={deck}

        onSave={handleSaveSuccess}
      />

      <LoadDeckModal
        isOpen={isLoadOpen}
        onClose={onLoadClose}
        onLoad={handleLoadSuccess}
      />

      <LocateModal
        isOpen={isLocateOpen}
        onClose={onLocateClose}
        deckId={deck.id}
        currentLocation={deck.location}
        onLocationUpdate={(locationData) => {
          setDeck(prevDeck => ({
            ...prevDeck,
            location: locationData.id
          }));
        }}
      />

      <ImportDeckModal
        isOpen={isImportOpen}
        onClose={onImportClose}
        onImport={handleImportResult}
      />

      <PublishConfirmationModal
        isOpen={isPublishConfirmOpen}
        onClose={onPublishConfirmClose}
        onConfirm={handleConfirmPublish}
        deckName={deck.name}
        userAlias={user?.alias}
        isLoading={isPublishing}
      />

      <CardDetailModal
        isOpen={isCardDetailOpen}
        onClose={onCardDetailClose}
        selectedCard={selectedCardForDetail}
        showProxies={true}
        onRefresh={handleRefreshCardInDeck}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={React.createRef()}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Deck
            </AlertDialogHeader>


            <AlertDialogBody>
              <VStack spacing={3} align="stretch">
                <Text>
                  Are you sure you want to delete this deck? This action cannot be undone.

                </Text>
                {deleteConfirmationDeck && (
                  <Text fontWeight="bold" color="red.600">
                    Deck: "{deleteConfirmationDeck.name}"
                  </Text>
                )}
                <Text fontSize="sm" color="gray.600">
                  Type the deck name to confirm deletion:
                </Text>
                <Input
                  placeholder="Enter deck name"
                  value={deleteInputValue}
                  onChange={(e) => setDeleteInputValue(e.target.value)}
                />
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>
                Cancel

              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDeleteDeck}
                ml={3}
                isDisabled={!deleteConfirmationDeck || deleteInputValue !== deleteConfirmationDeck.name}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
