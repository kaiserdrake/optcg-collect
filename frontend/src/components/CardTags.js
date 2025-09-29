import React, { useState, useEffect } from 'react';
import { dispatchCardUpdate, CARD_EVENTS } from '@/utils/cardEvents';
import { HStack, IconButton, useToast, Icon, Portal } from '@chakra-ui/react';
import { TAG_DEFINITIONS } from '@/utils/tagDefinitions';
import { useAuth } from '@/context/AuthContext';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Custom tooltip that renders in a portal to bypass overflow:hidden
const PortalTooltip = ({ label, children, isDisabled }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [delayTimeout, setDelayTimeout] = useState(null);

  if (isDisabled) return children;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });

    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 200);
    setDelayTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
      setDelayTimeout(null);
    }
    setIsVisible(false);
  };

  return (
    <>
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block' }}
      >
        {children}
      </span>
      {isVisible && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              backgroundColor: '#2D3748',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {label}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid #2D3748'
              }}
            />
          </div>
        </Portal>
      )}
    </>
  );
};

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
  const iconSize = size === "sm" ? 4 : 6;
  const buttonSize = size === "sm" ? "sm" : "md";

  // TagIcon with portal tooltip that bypasses overflow:hidden
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
      <PortalTooltip label={label} isDisabled={isLoading}>
        {iconElement}
      </PortalTooltip>
    ) : iconElement;
  };

  return (
    <HStack spacing={interactive ? 1 : 0.5}>
      {/* User Tags */}
      {(interactive || hasFavorite) && (
        <TagIcon
          icon={TAG_DEFINITIONS.favorite.icon}
          colorScheme={TAG_DEFINITIONS.favorite.colorScheme}
          label={TAG_DEFINITIONS.favorite.label}
          onClick={() => toggleUserTag('favorite')}
          isActive={hasFavorite}
          isLoading={loading.favorite}
        />
      )}

      {(interactive || hasWant) && (
        <TagIcon
          icon={TAG_DEFINITIONS.want.icon}
          colorScheme={TAG_DEFINITIONS.want.colorScheme}
          label={TAG_DEFINITIONS.want.label}
          onClick={() => toggleUserTag('want')}
          isActive={hasWant}
          isLoading={loading.want}
        />
      )}

      {/* Admin Tags */}
      {user?.role === 'Admin' && (interactive || isBanned) && (
        <TagIcon
          icon={TAG_DEFINITIONS.banned.icon}
          colorScheme={TAG_DEFINITIONS.banned.colorScheme}
          label={TAG_DEFINITIONS.banned.label}
          onClick={() => toggleAdminTag('banned')}
          isActive={isBanned}
          isLoading={loading.banned}
        />
      )}

      {user?.role === 'Admin' && (interactive || isRestricted) && (
        <TagIcon
          icon={TAG_DEFINITIONS.restricted.icon}
          colorScheme={TAG_DEFINITIONS.restricted.colorScheme}
          label={TAG_DEFINITIONS.restricted.label}
          onClick={() => toggleAdminTag('restricted')}
          isActive={isRestricted}
          isLoading={loading.restricted}
        />
      )}

      {/* Global tags visible to non-admin users (display only) */}
      {user?.role !== 'Admin' && isBanned && (
        <TagIcon
          icon={TAG_DEFINITIONS.banned.icon}
          colorScheme={TAG_DEFINITIONS.banned.colorScheme}
          label={TAG_DEFINITIONS.banned.label}
          isActive={true}
          disabled={true}
        />
      )}

      {user?.role !== 'Admin' && isRestricted && (
        <TagIcon
          icon={TAG_DEFINITIONS.restricted.icon}
          colorScheme={TAG_DEFINITIONS.restricted.colorScheme}
          label={TAG_DEFINITIONS.restricted.label}
          isActive={true}
          disabled={true}
        />
      )}
    </HStack>
  );
};

export default CardTags;
