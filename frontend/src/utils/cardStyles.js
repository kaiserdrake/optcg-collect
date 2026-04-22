// colorUtils.js

export const colorMap = {
  Red: '#E53E3E',
  Green: '#48BB78',
  Blue: '#4299E1',
  Purple: '#9F7AEA',
  Black: '#1A202C',
  Yellow: '#D69E2E',
};

/**
 * Returns Chakra UI Tag props for a color string (e.g. "Red" or "Red/Blue").
 */
export const getTagStyles = (colorString) => {
  if (!colorString) return { variant: 'subtle' };
  const colors = colorString.split('/').map(c => colorMap[c.trim()]).filter(Boolean);
  if (colors.length === 0) return { variant: 'subtle' };
  if (colors.length === 1) {
    return { bg: colors[0], color: 'white', variant: 'solid' };
  }
  const gradient = `linear(to-r, ${colors.join(', ')})`;
  return { bgGradient: gradient, color: 'white', variant: 'solid' };
};

/**
 * Converts a string to title case.
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Decodes common HTML entities (&lt;, &gt;, &amp;, etc.).
 */
export function decodeHTMLEntities(str) {
  if (!str) return str;
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Removes all HTML tags and decodes HTML entities.
 */
export function stripHtml(str) {
  if (!str) return '';
  const noTags = str.replace(/<[^>]*>/g, ' ').trim();
  return decodeHTMLEntities(noTags);
}

/**
 * Location marker color definitions
 */
export const locationMarkerColors = {
  red: {
    solid: 'red.500',
    bg: '#E53E3E',
    text: 'white'
  },
  orange: {
    solid: 'orange.500',
    bg: '#DD6B20',
    text: 'white'
  },
  yellow: {
    solid: 'yellow.500',
    bg: '#D69E2E',
    text: 'white'
  },
  green: {
    solid: 'green.500',
    bg: '#38A169',
    text: 'white'
  },
  blue: {
    solid: 'blue.500',
    bg: '#3182CE',
    text: 'white'
  },
  purple: {
    solid: 'purple.500',
    bg: '#805AD5',
    text: 'white'
  },
  pink: {
    solid: 'pink.500',
    bg: '#D53F8C',
    text: 'white'
  },
  gray: {
    solid: 'gray.500',
    bg: '#718096',
    text: 'white'
  }
};

/**
 * Get solid color for location marker
 */
export const getLocationMarkerColor = (marker) => {
  return locationMarkerColors[marker]?.solid || 'blue.500';
};

/**
 * Get background color hex for location marker
 */
export const getLocationMarkerBg = (marker) => {
  return locationMarkerColors[marker]?.bg || '#3182CE';
};

/**
 * Get text color for location marker (always white for contrast)
 */
export const getLocationMarkerText = (marker) => {
  return locationMarkerColors[marker]?.text || 'white';
};

/**
 * Get Chakra UI color scheme from marker
 */
export const getLocationColorScheme = (marker) => {
  const schemes = {
    red: 'red',
    orange: 'orange',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    purple: 'purple',
    pink: 'pink',
    gray: 'gray'
  };
  return schemes[marker] || 'blue';
};
