'use client';

import { Input } from '@chakra-ui/react';
import React from 'react';

const AdvancedSearchInput = ({ value, onChange, ...props }) => {
  // Simple approach: just use a regular input with normal text color
  // Let the parent handle any highlighting if needed

  return (
    <Input
      value={value}
      onChange={onChange}
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
  );
};

export default AdvancedSearchInput;
