'use client';

import React from 'react';
import { Input, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

// Simple validation function - just checks if input would be valid
export const validateSearchInput = (value, inCollection = false) => {
  const sanitizedValue = typeof value === 'string' ? value.trim() : '';

  // Extract advanced keywords using the same regex as backend
  const criteria = { id: null, pack: null, colors: [], exact: null, location: null, category: null, cost: null, tags: [] };
  const regex = /(\w+):("([^"]+)"|(\S+))/g;
  let match;


  while ((match = regex.exec(sanitizedValue)) !== null) {
    const key = match[1].toLowerCase();
    const keywordValue = (match[3] || match[4]).trim();
    if (key === 'id' && keywordValue.length > 0) criteria.id = keywordValue;
    if (key === 'pack' && keywordValue.length > 0) criteria.pack = keywordValue;
    if (key === 'color' && keywordValue.length > 0) criteria.colors.push(keywordValue);
    if (key === 'exact' && keywordValue.length > 0) criteria.exact = keywordValue;
    if (key === 'location' && keywordValue.length > 0) criteria.location = keywordValue;
    if (key === 'category' && keywordValue.length > 0) criteria.category = keywordValue;
    if (key === 'cost' && keywordValue.length > 0) criteria.cost = keywordValue;
    if (key === 'tag' && keywordValue.length > 0) criteria.tags.push(keywordValue);
  }

  // Extract fuzzy text (text remaining after removing keywords)
  const fuzzyText = sanitizedValue.replace(regex, '').trim();

  // Check if we have special criteria (advanced keywords)
  const hasSpecialCriteria = criteria.id || criteria.pack || criteria.colors.length > 0 ||
                             criteria.exact || criteria.location || criteria.category || criteria.cost || criteria.tags.length > 0;

  // Validation logic matching backend requirements
  if (inCollection) {
    // Case 1: "In Collection" is true - any fuzzyText length allowed
    return { isValid: true, message: '' };
  } else if (hasSpecialCriteria) {
    // Case 2: Advanced keywords present - any fuzzyText length allowed
    return { isValid: true, message: '' };
  } else if (!fuzzyText || fuzzyText.length === 0) {
    // Case 3: No fuzzyText and no special conditions - empty search
    return {
      isValid: false,
      message: 'Start typing to search for cards'
    };
  } else if (fuzzyText.length < 3) {
    // Case 4: Normal search with insufficient fuzzyText length
    return {
      isValid: false,
      message: 'Search term must be at least 3 characters. Use keywords like category:, id:, exact:, cost:, tag: for shorter searches.'
    };
  } else {
    // Case 5: Valid normal search
    return { isValid: true, message: '' };
  }
};

const AdvancedSearchInput = ({ value, onChange, onSearch, ...props }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch();
    }
  };

  return (
    <InputGroup>
      <Input
        value={value}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        variant="filled"
        size="md"
        color="gray.800"
        _placeholder={{ color: 'gray.400' }}
        _focus={{
          bg: 'white',
          borderColor: 'blue.500',
          boxShadow: '0 0 0 1px #3182ce',
        }}
        {...props}
      />
      <InputRightElement>
        <IconButton
          aria-label="Search"
          icon={<SearchIcon />}
          size="sm"
          variant="ghost"
          onClick={handleSearchClick}
          _hover={{
            bg: 'blue.100',
          }}
        />
      </InputRightElement>
    </InputGroup>
  );
};

export default AdvancedSearchInput;
