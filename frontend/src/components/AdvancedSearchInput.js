'use client';

import { Box, Input, Text } from '@chakra-ui/react';
import React from 'react';

const colorMap = {
  red: '#E53E3E',
  green: '#48BB78',
  blue: '#4299E1',
  purple: '#9F7AEA',
  black: '#1A202C',
  yellow: '#D69E2E',
};

const AdvancedSearchInput = ({ value, onChange, ...props }) => {
  // Helper to render the highlighted text with color values
  const renderHighlightedText = () => {
    // Regex matches: id:something, pack:something, color:something
    // We'll split by these, keeping them in the result
    // It will match the entire "keyword:value" as one part
    const regex = /(id:\S*|pack:\S*|color:\S*)/gi;
    const parts = value.split(regex);

    return (
      <>
        {parts.map((part, index) => {
          // Match keyword:value pattern
          const match = part.match(/^(id|pack|color):(\S*)$/i);
          if (match) {
            const [full, keyword, keywordValue] = match;
            if (keyword.toLowerCase() === 'color') {
              // "color:" in gray, value in mapped color
              const valueColor =
                colorMap[keywordValue?.toLowerCase()] || 'gray.500';
              return (
                <React.Fragment key={index}>
                  <Text as="span" color="gray.500">
                    color:
                  </Text>
                  {keywordValue && (
                    <Text as="span" color={valueColor} fontWeight="bold">
                      {keywordValue}
                    </Text>
                  )}
                </React.Fragment>
              );
            } else {
              // id: or pack: -- all gray
              return (
                <Text as="span" key={index} color="gray.500">
                  {full}
                </Text>
              );
            }
          }
          // Non-keyword parts, render as normal text
          return (
            <Text as="span" key={index}>
              {part}
            </Text>
          );
        })}
      </>
    );
  };

  const inputStyles = {
    p: 4,
    fontSize: "lg",
    height: "3rem",
    width: "100%",
    letterSpacing: 'normal',
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
        sx={{ ...inputStyles }}
      >
        {renderHighlightedText()}
      </Box>
      <Input
        value={value}
        onChange={onChange}
        position="relative"
        zIndex={2}
        bg="transparent"
        // Make text transparent but caret visible
        color="transparent"
        caretColor="black"
        variant="unstyled"
        sx={{
          ...inputStyles,
          // Custom caret for better visibility if needed
          // You may style this further for other themes
        }}
        {...props}
      />
    </Box>
  );
};

export default AdvancedSearchInput;
