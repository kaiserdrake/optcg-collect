'use client';

import { Box, Input, Text } from '@chakra-ui/react';
import React from 'react';

const AdvancedSearchInput = ({ value, onChange, ...props }) => {
  const renderHighlightedText = () => {
    const parts = value.split(/(id:\S*|pack:\S*|color:\S*)/gi);

    return (
      <>
        {parts.map((part, index) => {
          if (part.toLowerCase().startsWith('id:')) {
            return <Text as="span" key={index} color="blue.500">{part}</Text>;
          }
          if (part.toLowerCase().startsWith('pack:')) {
            return <Text as="span" key={index} color="green.500">{part}</Text>;
          }
          if (part.toLowerCase().startsWith('color:')) {
            return <Text as="span" key={index} color="purple.500">{part}</Text>;
          }
          return part;
        })}
      </>
    );
  };

  const inputStyles = {
    p: 4,
    fontSize: "lg",
    height: "3rem",
    width: "100%",
  };

  return (
    <Box
      position="relative"
      width="100%"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      _hover={{ borderColor: 'gray.300' }}
      _focusWithin={{
        borderColor: 'blue.500',
        boxShadow: '0 0 0 1px #3182ce',
      }}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        zIndex={1}
        pointerEvents="none"
        whiteSpace="pre"
        overflow="hidden"
        display="flex"
        alignItems="center"
        sx={{...inputStyles}}
      >
        {renderHighlightedText()}
      </Box>
      <Input
        value={value}
        onChange={onChange}
        position="relative"
        zIndex={2}
        bg="transparent"
        color="transparent"
        caretColor="black"
        variant="unstyled"
        sx={{...inputStyles}}
        {...props}
      />
    </Box>
  );
};

export default AdvancedSearchInput;

