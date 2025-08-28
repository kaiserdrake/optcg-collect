import React from 'react';
import { Box, Text, Tag } from '@chakra-ui/react';
import { keywordStyles, keywordPatterns } from '@/utils/keywordStyles';

const StyledTextRenderer = ({ text }) => {
  if (!text || text.trim() === '' || text.trim() === '-') {
    return <Text as="span">&nbsp;</Text>;
  }

  // First, handle HTML tags like <br> by splitting the text
  const htmlParts = text.split(/(<br\s*\/?>)/gi);

  return (
    <Box>
      {htmlParts.map((htmlPart, htmlIndex) => {
        // If this is a <br> tag, render a line break
        if (htmlPart.match(/<br\s*\/?>/gi)) {
          return <Box key={htmlIndex} w="100%" h="1em" />;
        }

        // Skip empty HTML parts
        if (!htmlPart.trim()) {
          return null;
        }

        // Now split by keywords for this HTML part
        const parts = htmlPart.split(/(\[.*?\])/g);

        return (
          <Box key={htmlIndex} display="inline" flexWrap="wrap" alignItems="center">
            {parts.map((part, index) => {
              if (part.match(/^\[.*\]$/)) {
                const keyword = part.slice(1, -1).toLowerCase();
                const style = keywordStyles[keyword];
                if (style) {
                  return (
                    <Tag
                      key={index}
                      {...style}
                      display="inline-flex"
                      flexShrink={0}
                      whiteSpace="nowrap"
                      mr={1}
                    >
                      {part.slice(1, -1)}
                    </Tag>
                  );
                }
                const patternMatch = keywordPatterns.find(p => p.regex.test(part.slice(1, -1)));
                if (patternMatch) {
                  return (
                    <Tag
                      key={index}
                      {...patternMatch.style}
                      display="inline-flex"
                      flexShrink={0}
                      whiteSpace="nowrap"
                      mr={1}
                    >
                      {part.slice(1, -1)}
                    </Tag>
                  );
                }
                // Only render as a keyword tag if it matches known keywords or patterns
                // Otherwise, treat it as regular text (like card names)
                return (
                  <Text
                    key={index}
                    as="span"
                    display="inline"
                  >
                    {part}
                  </Text>
                );
              }
              // Only render non-empty text parts
              if (part.trim()) {
                return (
                  <Text
                    key={index}
                    as="span"
                    display="inline"
                  >
                    {part}
                  </Text>
                );
              }
              return null;
            })}
          </Box>
        );
      })}
    </Box>
  );
};

export default StyledTextRenderer;
