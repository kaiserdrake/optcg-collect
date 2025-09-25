'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@chakra-ui/react';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useDeckBuilder = () => {
  // Deck state
  const [deck, setDeck] = useState({
    id: null,
    name: 'New Deck',
    thumbnail: null,
    cards: [], // Array of { card, count } objects OR { id, name, category, ..., count } objects
    location: null
  });

  // UI state
  const [isClient, setIsClient] = useState(false);
  const [sortMode, setSortMode] = useState('cost');
  const [sortReverse, setSortReverse] = useState(false);
  const [thumbnailSelectorCard, setThumbnailSelectorCard] = useState(null);
  const [deleteConfirmationDeck, setDeleteConfirmationDeck] = useState(null);
  const [deleteInputValue, setDeleteInputValue] = useState('');
  const [selectedCardForDetail, setSelectedCardForDetail] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [previousLeaderColors, setPreviousLeaderColors] = useState([]);

  const toast = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to safely get card data from item
  const getCardData = useCallback((item) => {
    if (!item) return null;
    // Handle both structures: { card: {...}, count } or { id, name, ..., count }
    return item.card || item;
  }, []);

  // Get leader card
  const getLeader = useCallback(() => {
    return deck.cards.find(item => {
      const cardData = getCardData(item);
      return cardData && cardData.category === 'LEADER';
    });
  }, [deck.cards, getCardData]);

  // Get non-leader cards
  const getNonLeaderCards = useCallback(() => {
    return deck.cards.filter(item => {
      const cardData = getCardData(item);
      return cardData && cardData.category !== 'LEADER';
    });
  }, [deck.cards, getCardData]);

  // Get leader colors for color validation
  const getLeaderColors = useCallback(() => {
    const leader = getLeader();
    if (!leader) return [];
    const leaderData = getCardData(leader);
    return leaderData && leaderData.color ?
      leaderData.color.split('/').map(color => color.trim()) : [];
  }, [getLeader, getCardData]);

  // Check if deck has color mismatches
  const checkColorMismatch = useCallback(() => {
    const leader = getLeader();
    if (!leader) return false;

    const leaderColors = getLeaderColors();
    if (leaderColors.length === 0) return false;

    const nonLeaderCards = getNonLeaderCards();
    return nonLeaderCards.some(item => {
      const cardData = getCardData(item);
      if (!cardData || !cardData.color) return false;
      const cardColors = cardData.color.split('/').map(color => color.trim());
      return !cardColors.some(color => leaderColors.includes(color));
    });
  }, [getLeader, getLeaderColors, getNonLeaderCards, getCardData]);

  // Check if deck has banned cards
  const checkBannedCards = useCallback(() => {
    return deck.cards.some(item => {
      const cardData = getCardData(item);
      if (!cardData) return false;
      const globalTags = cardData.global_tags || [];
      return globalTags.includes('banned');
    });
  }, [deck.cards, getCardData]);

  // Simple updateSearchKeyword function (no programmatic triggering)
  const updateSearchKeyword = useCallback((keyword) => {
    setSearchKeyword(keyword);
  }, []);

  // Add card to deck
  const addCardToDeck = useCallback((cardData) => {
    if (!cardData) return;

    setDeck(prevDeck => {
      // 1. LEADER VALIDATION
      if (cardData.category === 'LEADER') {
        const existingLeader = prevDeck.cards.find(item => {
          const existingCardData = getCardData(item);
          return existingCardData && existingCardData.category === 'LEADER';
        });

        if (existingLeader) {
          const existingLeaderData = getCardData(existingLeader);
          if (existingLeaderData && existingLeaderData.card_code !== cardData.card_code) {
            toast({
              title: 'Cannot add leader',
              description: 'You can only have one leader in your deck. Remove the current leader first.',
              status: 'warning',
              duration: 3000,
              isClosable: true,
            });
            return prevDeck;
          }
        }

        // Replace existing leader with same card_code or add new leader
        const existingLeaderIndex = prevDeck.cards.findIndex(item => {
          const existingCardData = getCardData(item);
          return existingCardData && existingCardData.category === 'LEADER';
        });

        if (existingLeaderIndex !== -1) {
          const newCards = [...prevDeck.cards];
          newCards[existingLeaderIndex] = { card: cardData, count: 1 };
          return { ...prevDeck, cards: newCards };
        } else {
          return {
            ...prevDeck,
            cards: [...prevDeck.cards, { card: cardData, count: 1 }]
          };
        }
      }

      // 2. 4-COPY VALIDATION (by card_code)
      const currentCardCodeCount = prevDeck.cards
      .filter(item => {
        const existingCardData = getCardData(item);
        return existingCardData && existingCardData.card_code === cardData.card_code;
      })
      .reduce((sum, item) => sum + item.count, 0);

      if (currentCardCodeCount >= 4) {
        toast({
          title: 'Maximum copies reached',
          description: `You already have 4 copies of ${cardData.name} in your deck`,
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return prevDeck;
      }

      // 3. ADD OR INCREMENT CARD (by card.id for grouping)
      const existingCardIndex = prevDeck.cards.findIndex(item => {
        const existingCardData = getCardData(item);
        return existingCardData && existingCardData.id === cardData.id;
      });


      if (existingCardIndex !== -1) {
        // Card already exists, increment count
        const existingItem = prevDeck.cards[existingCardIndex];
        const newCards = [...prevDeck.cards];

        newCards[existingCardIndex] = { ...existingItem, count: existingItem.count + 1 };
        return { ...prevDeck, cards: newCards };
      } else {
        // Add new card
        return {
          ...prevDeck,
          cards: [...prevDeck.cards, { card: cardData, count: 1 }]
        };
      }

    });
  }, [getCardData, toast]);

  // Remove card from deck
  const removeCardFromDeck = useCallback((cardToRemove) => {
    if (!cardToRemove) return;

    setDeck(prevDeck => {
      const cardData = cardToRemove.card || cardToRemove;
      const existingIndex = prevDeck.cards.findIndex(item => {
        const existingCardData = item.card || item;
        return existingCardData.id === cardData.id;
      });

      if (existingIndex === -1) return prevDeck;

      const updatedCards = [...prevDeck.cards];
      if (updatedCards[existingIndex].count > 1) {
        // Decrease count
        updatedCards[existingIndex] = {
          ...updatedCards[existingIndex],
          count: updatedCards[existingIndex].count - 1
        };
      } else {
        // Remove card entirely
        updatedCards.splice(existingIndex, 1);
      }

      return { ...prevDeck, cards: updatedCards };
    });
  }, []);

  // Sorted cards for display
  const sortedCards = useMemo(() => {
    const leaderCards = deck.cards.filter(item => {
      const cardData = getCardData(item);
      return cardData && cardData.category === 'LEADER';
    });

    const nonLeaderCards = deck.cards.filter(item => {
      const cardData = getCardData(item);
      return cardData && cardData.category !== 'LEADER';
    });

    let sortedNonLeaderCards;
    switch (sortMode) {
      case 'cost':
        sortedNonLeaderCards = nonLeaderCards.sort((a, b) => {
          const aData = getCardData(a);
          const bData = getCardData(b);
          const costCompare = (aData?.cost || 0) - (bData?.cost || 0);
          if (costCompare !== 0) {
            return sortReverse ? -costCompare : costCompare;
          }
          const nameCompare = (aData?.name || '').localeCompare(bData?.name || '');
          return sortReverse ? -nameCompare : nameCompare;
        });
        break;
      case 'name':
        sortedNonLeaderCards = nonLeaderCards.sort((a, b) => {
          const aData = getCardData(a);
          const bData = getCardData(b);
          const nameCompare = (aData?.name || '').localeCompare(bData?.name || '');
          return sortReverse ? -nameCompare : nameCompare;
        });
        break;
      case 'type':
        sortedNonLeaderCards = nonLeaderCards.sort((a, b) => {
          const aData = getCardData(a);
          const bData = getCardData(b);
          const categoryCompare = (aData?.category || '').localeCompare(bData?.category || '');
          if (categoryCompare !== 0) {
            return sortReverse ? -categoryCompare : categoryCompare;
          }
          const nameCompare = (aData?.name || '').localeCompare(bData?.name || '');
          return sortReverse ? -nameCompare : nameCompare;
        });
        break;
      default:
        sortedNonLeaderCards = nonLeaderCards;
    }

    // Always return leader cards first, then sorted non-leader cards
    return [...leaderCards, ...sortedNonLeaderCards];
  }, [deck.cards, sortMode, sortReverse, getCardData]);

  // Calculate deck stats with enhanced validation
  const deckStats = useCallback(() => {
    const leader = getLeader();
    const nonLeaderCards = getNonLeaderCards();
    const cardCount = nonLeaderCards.reduce((sum, item) => sum + item.count, 0);

    const result = {
      hasLeader: !!leader,
      cardCount,
      isValid: !!leader && cardCount >= 0 && cardCount <= 50,
      hasColorMismatch: checkColorMismatch(),
      hasBannedCard: checkBannedCards()
    };
    return result;
  }, [getLeader, getNonLeaderCards, checkColorMismatch, checkBannedCards]);

  // Handle thumbnail selection
  const handleThumbnailClick = (onThumbnailOpen) => {
    if (deck.cards.length === 0) {
      toast({
        title: 'No cards in deck',
        description: 'Add cards to your deck first to select a thumbnail',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    onThumbnailOpen();
  };

  // Handle thumbnail selection
  const handleThumbnailSelect = (selectedCard, onThumbnailClose) => {
    setDeck(prevDeck => ({
      ...prevDeck,
      thumbnail: selectedCard.img_url
    }));
    onThumbnailClose();
  };

  // Handle card click for detail modal
  const handleCardClick = (card, onCardDetailOpen) => {
    setSelectedCardForDetail(card);
    onCardDetailOpen();
  };

  // Clear deck - NO programmatic search keyword setting
  const clearDeck = () => {
    setDeck({
      id: null,
      name: 'New Deck',
      thumbnail: null,
      cards: [],
      location: null
    });
    setPreviousLeaderColors([]);
    toast({
      title: 'Deck cleared',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Update deck name
  const updateDeckName = (newName) => {
    setDeck(prevDeck => ({ ...prevDeck, name: newName }));
  };

  // Update entire deck state (for when SaveDeckModal completes save)
  const updateDeck = (newDeckData) => {
    setDeck(newDeckData);
  };

  // Share deck as text list
  const shareDeckList = () => {
    const leader = getLeader();
    const nonLeaderCards = getNonLeaderCards();

    if (!leader || nonLeaderCards.length === 0) {
      toast({
        title: 'Incomplete deck',
        description: 'Add a leader and some cards to share the deck list',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const leaderData = getCardData(leader);

    // Format: "1xOP10-001" - use card codes instead of names
    const leaderText = `${leader.count}x${leaderData.card_code}`;

    const cardTexts = nonLeaderCards.map(item => {
      const cardData = getCardData(item);
      return `${item.count}x${cardData.card_code}`;
    });

    // Combine leader and cards in the correct format (each on new line)
    const fullText = [leaderText, ...cardTexts].join('\n');

    navigator.clipboard.writeText(fullText).then(() => {
      toast({
        title: 'Deck list copied!',
        description: 'The deck list has been copied to your clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }).catch(() => {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy deck list to clipboard',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
  };

  // Delete deck handling
  const handleDeleteDeck = (onDeleteOpen) => {
    if (!deck.id) {
      toast({
        title: 'Cannot delete',
        description: 'This deck has not been saved yet',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setDeleteConfirmationDeck(deck);
    onDeleteOpen();
  };

  const confirmDeleteDeck = async (onDeleteClose) => {
    if (!deleteConfirmationDeck || deleteInputValue !== deleteConfirmationDeck.name) {
      toast({
        title: 'Confirmation failed',
        description: 'Please type the deck name exactly to confirm deletion',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(`${api}/api/decks/${deleteConfirmationDeck.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Deck deleted',
          description: `"${deleteConfirmationDeck.name}" has been deleted`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        clearDeck();
      } else {
        throw new Error('Failed to delete deck');
      }
    } catch (error) {
      console.error('Delete deck error:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete the deck. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeleteConfirmationDeck(null);
      setDeleteInputValue('');
      onDeleteClose();
    }
  };

  const handleLoadDeck = async (deckToLoad, onLoadClose) => {
    try {
      const response = await fetch(`${api}/api/decks/${deckToLoad.id || deckToLoad}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const loadedDeck = await response.json();

        setDeck(loadedDeck);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('loadDeck');
          window.history.replaceState({}, '', url);
        }

        setPreviousLeaderColors([]);

        toast({
          title: 'Deck loaded',
          description: `"${loadedDeck.name}" has been loaded`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to load deck');
      }
    } catch (error) {
      console.error('Load deck error:', error);
      toast({
        title: 'Load failed',
        description: 'Could not load the deck. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onLoadClose();
    }
  };

  const handleSaveDeck = async (deckData, onSaveClose) => {
    try {
      const method = deckData.id ? 'PUT' : 'POST';
      const url = deckData.id ? `${api}/api/decks/${deckData.id}` : `${api}/api/decks`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(deckData),
      });

      if (response.ok) {
        const savedDeck = await response.json();
        updateDeck(savedDeck);
        toast({
          title: 'Deck saved',
          description: `"${savedDeck.name}" has been saved`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to save deck');
      }
    } catch (error) {
      console.error('Save deck error:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save the deck. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onSaveClose();
    }
  };

  return {
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
    stats: deckStats(),
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
    handleSaveDeck,
  };
};
