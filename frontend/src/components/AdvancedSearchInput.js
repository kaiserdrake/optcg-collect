'use client';

import { Box, Input, Text } from '@chakra-ui/react';
import React from 'react';

const AdvancedSearchInput = ({ value, onChange, ...props }) => {
  // Regex to match keyword:value
  const regex = /(id:\S*|pack:\S*|color:\S*)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Find all matches and build parts array with text and underlined segments
  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      // Push any text before the match
      parts.push({
        text: value.slice(lastIndex, match.index),
        type: 'text',
        key: `text-${lastIndex}`
      });
    }
    // Push the matched keyword:value as underlined
    parts.push({
      text: match[0],
      type: 'keyword',
      key: `kw-${match[0]}-${match.index}`
    });
    lastIndex = regex.lastIndex;
  }
  // Add any remaining text after the last match
  if (lastIndex < value.length) {
    parts.push({
      text: value.slice(lastIndex),
      type: 'text',
      key: `text-${lastIndex}`
    });
  }

  const renderHighlightedText = () => (
    <>
      {parts.map((part) =>
        part.type === 'keyword' ? (
          <Text as="span" key={part.key} textDecoration="underline" color="gray.700">
            {part.text}
          </Text>
        ) : (
          <Text as="span" key={part.key}>
            {part.text}
          </Text>
        )
      )}
    </>
  );

  const inputStyles = {
    p: 4,
    fontSize: "lg",
    height: "3rem",
    width: "100%",
    letterSpacing: 'normal',
    fontFamily: 'inherit',
    lineHeight: 'normal',
    background: 'transparent',
    color: 'transparent',
    caretColor: '#222',
    textShadow: '0 0 0 #222',
    WebkitTextFillColor: 'transparent',
    MozTextFillColor: 'transparent',
    WebkitCaretColor: '#222',
    MozCaretColor: '#222',
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
        sx={{
          ...inputStyles,
          color: 'inherit',
          textShadow: 'none',
          WebkitTextFillColor: 'inherit',
          MozTextFillColor: 'inherit',
        }}
      >
        {renderHighlightedText()}
      </Box>
      <Input
        value={value}
        onChange={onChange}
        position="relative"
        zIndex={2}
        variant="unstyled"
        sx={inputStyles}
        style={{
          caretColor: '#222',
          color: 'transparent',
          textShadow: '0 0 0 #222',
          WebkitTextFillColor: 'transparent',
          MozTextFillColor: 'transparent',
          WebkitCaretColor: '#222',
          MozCaretColor: '#222',
        }}
        {...props}
      />
    </Box>
  );
};

export default AdvancedSearchInput;

