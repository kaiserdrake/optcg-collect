// utils/cardEvents.js
// Global event system for card data synchronization

export const CARD_EVENTS = {
  TAG_UPDATED: 'card:tag_updated',
  LOCATION_UPDATED: 'card:location_updated',
  COUNT_UPDATED: 'card:count_updated'
};

// Dispatch a card update event
export const dispatchCardUpdate = (eventType, cardId, additionalData = {}) => {
  if (typeof window === 'undefined') return; // SSR safety

  const event = new CustomEvent(eventType, {
    detail: {
      cardId,
      timestamp: Date.now(),
      ...additionalData
    }
  });

  window.dispatchEvent(event);
};
