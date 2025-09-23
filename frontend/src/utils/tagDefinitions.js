// Centralized tag definitions for CardTags components
import { BsBookmarkStarFill, BsFillSimSlashFill } from 'react-icons/bs';
import { GiBuyCard } from 'react-icons/gi';
import { TbAlertHexagonFilled } from 'react-icons/tb';

export const TAG_DEFINITIONS = {
  // User tags - can be set by any user for their personal use
  favorite: {
    icon: BsBookmarkStarFill,
    colorScheme: 'blue',
    label: 'Favorite',
    type: 'user'
  },
  want: {
    icon: GiBuyCard,
    colorScheme: 'red',
    label: 'Want',
    type: 'user'
  },

  // Admin tags - only admins can set these, visible globally
  banned: {
    icon: BsFillSimSlashFill,
    colorScheme: 'red',
    label: 'Banned',
    type: 'admin'
  },
  restricted: {
    icon: TbAlertHexagonFilled,
    colorScheme: 'yellow',
    label: 'Restricted',
    type: 'admin'
  }
};

// Helper functions
export const getUserTags = () => {
  return Object.entries(TAG_DEFINITIONS)
    .filter(([_, config]) => config.type === 'user')
    .reduce((acc, [key, config]) => {
      acc[key] = config;
      return acc;
    }, {});
};

export const getAdminTags = () => {
  return Object.entries(TAG_DEFINITIONS)
    .filter(([_, config]) => config.type === 'admin')
    .reduce((acc, [key, config]) => {
      acc[key] = config;
      return acc;
    }, {});
};

export const getTagConfig = (tagType) => {
  return TAG_DEFINITIONS[tagType] || null;
};

// Get all valid tag types as array
export const getAllTagTypes = () => {
  return Object.keys(TAG_DEFINITIONS);
};

// Get tag options for dropdowns/selects - only user tags for now
export const getTagOptions = () => {
  return Object.entries(getUserTags()).map(([key, config]) => ({
    value: key,
    label: config.label,
    icon: config.icon,
    colorScheme: config.colorScheme
  }));
};
