import React, { useState, useEffect } from 'react';
import { dispatchCardUpdate, CARD_EVENTS } from '@/utils/cardEvents';
import { HStack, IconButton, Tooltip, useToast, Icon } from '@chakra-ui/react';
import { FiBookmark, FiHeart, FiSlash, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CardTags = ({
  cardId,
  card,
  interactive = true,
  size = "sm",
  showTooltips = true,
  onTagUpdate
}) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState({});
  const { user } = useAuth();
  const toast = useToast();

  // Determine data source: card prop (from search results) or fetch separately
  const useCardData = card && (card.user_tags || card.global_tags);

  useEffect(() => {
    if (useCardData) {
      setTags([
        ...(card.user_tags || []).map(tagType => ({ tag_type: tagType, is_global: false })),
        ...(card.global_tags || []).map(tagType => ({ tag_type: tagType, is_global: true }))
      ]);
    } else if (cardId && interactive) {
      loadTags();
    }
  }, [cardId, card, useCardData, interactive]);

  const loadTags = async () => {
    try {
      const res = await fetch(`${api}/api/cards/${encodeURIComponent(cardId)}/tags`, {
        credentials: 'include',
      });
      if (res.ok) {
        const tagData = await res.json();
        setTags(tagData);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const toggleUserTag = async (tagType) => {
    if (!interactive) return;

    const hasTag = tags.some(tag => tag.tag_type === tagType && !tag.is_global);
    const action = hasTag ? 'remove' : 'add';

    setLoading(prev => ({ ...prev, [tagType]: true }));

    try {
      const res = await fetch(`${api}/api/cards/${encodeURIComponent(cardId)}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tagType, action }),
      });

      if (res.ok) {
        await loadTags(); // Refresh tags

        // Call the onTagUpdate callback if provided
        if (onTagUpdate && typeof onTagUpdate === 'function') {
          onTagUpdate();
        }
        dispatchCardUpdate(CARD_EVENTS.TAG_UPDATED, cardId);
      } else {
        const error = await res.json();
        if (toast) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update tag',
            status: 'error',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      if (toast) {
        toast({
          title: 'Error',
          description: 'Network error while updating tag',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setLoading(prev => ({ ...prev, [tagType]: false }));
    }
  };

  const toggleAdminTag = async (tagType) => {
    if (!interactive) return;

    const hasTag = tags.some(tag => tag.tag_type === tagType && tag.is_global);
    const action = hasTag ? 'remove' : 'add';

    setLoading(prev => ({ ...prev, [tagType]: true }));

    try {
      const res = await fetch(`${api}/api/cards/${encodeURIComponent(cardId)}/admin-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tagType, action }),
      });

      if (res.ok) {
        await loadTags(); // Refresh tags

        // Call the onTagUpdate callback if provided
        if (onTagUpdate && typeof onTagUpdate === 'function') {
          onTagUpdate();
        }
        dispatchCardUpdate(CARD_EVENTS.TAG_UPDATED, cardId);
      } else {
        const error = await res.json();
        if (toast) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update tag',
            status: 'error',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      if (toast) {
        toast({
          title: 'Error',
          description: 'Network error while updating tag',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setLoading(prev => ({ ...prev, [tagType]: false }));
    }
  };

  // Check if user has a specific tag
  const hasUserTag = (tagType) => {
    return tags.some(tag => tag.tag_type === tagType && !tag.is_global);
  };

  // Check if there's a global admin tag
  const hasGlobalTag = (tagType) => {
    return tags.some(tag => tag.tag_type === tagType && tag.is_global);
  };

  const hasFavorite = hasUserTag('favorite');
  const hasWant = hasUserTag('want');
  const isBanned = hasGlobalTag('banned');
  const isRestricted = hasGlobalTag('restricted');

  if (!interactive && !hasFavorite && !hasWant && !isBanned && !isRestricted) {
    return null;
  }

  // Icon size mapping
  const iconSize = size === "sm" ? 3 : 4;
  const buttonSize = size === "sm" ? "xs" : "sm";

  // Improved TagIcon with solid/ghost variant
  const TagIcon = ({
    icon,
    colorScheme = "gray",
    label,
    onClick,
    isActive,
    isLoading,
    disabled = false
  }) => {
    const variant = isActive ? "solid" : "ghost";
    const color = isActive ? undefined : "gray.400";
    const iconElement = interactive ? (
      <IconButton
        icon={React.createElement(icon)}
        size={buttonSize}
        variant={variant}
        colorScheme={colorScheme}
        color={color}
        _hover={isActive ? { bg: `${colorScheme}.600` } : { color: `${colorScheme}.600`, bg: `${colorScheme}.50` }}
        isLoading={isLoading}
        onClick={onClick}
        aria-label={label}
        isDisabled={disabled}
      />
    ) : (
      <Icon as={icon} boxSize={iconSize} color={isActive ? `${colorScheme}.600` : "gray.400"} />
    );

    return showTooltips ? (
      <Tooltip label={label} hasArrow>
        {iconElement}
      </Tooltip>
    ) : iconElement;
  };

  return (
    <HStack spacing={interactive ? 1 : 0.5}>
      {/* User Tags */}
      {(interactive || hasFavorite) && (
        <TagIcon
          icon={FiBookmark}
          colorScheme="blue"
          label="Favorite"
          onClick={() => toggleUserTag('favorite')}
          isActive={hasFavorite}
          isLoading={loading.favorite}
        />
      )}

      {(interactive || hasWant) && (
        <TagIcon
          icon={FiHeart}
          colorScheme="red"
          label="Want"
          onClick={() => toggleUserTag('want')}
          isActive={hasWant}
          isLoading={loading.want}
        />
      )}

      {/* Admin Tags */}
      {user?.role === 'Admin' && (interactive || isBanned) && (
        <TagIcon
          icon={FiSlash}
          colorScheme="red"
          label="Banned"
          onClick={() => toggleAdminTag('banned')}
          isActive={isBanned}
          isLoading={loading.banned}
        />
      )}

      {user?.role === 'Admin' && (interactive || isRestricted) && (
        <TagIcon
          icon={FiAlertTriangle}
          colorScheme="yellow"
          label="Restricted"
          onClick={() => toggleAdminTag('restricted')}
          isActive={isRestricted}
          isLoading={loading.restricted}
        />
      )}

      {/* Global tags visible to non-admin users (display only) */}
      {user?.role !== 'Admin' && isBanned && (
        <TagIcon
          icon={FiSlash}
          colorScheme="red"
          label="Banned"
          isActive={true}
          disabled={true}
        />
      )}

      {user?.role !== 'Admin' && isRestricted && (
        <TagIcon
          icon={FiAlertTriangle}
          colorScheme="yellow"
          label="Restricted"
          isActive={true}
          disabled={true}
        />
      )}
    </HStack>
  );
};

export default CardTags;
