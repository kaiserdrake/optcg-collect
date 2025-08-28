// Test component to verify English URL checking
// You can temporarily add this to your page to test

import React, { useState, useEffect } from 'react';
import { Box, Text, VStack, HStack, Badge, Button } from '@chakra-ui/react';
import CardImage from './CardImage';

const EnglishUrlTest = () => {
  const [testResults, setTestResults] = useState([]);

  const testUrls = [
    {
      name: "EB01-046 (should have English version)",
      original: "https://asia-en.onepiece-cardgame.com/images/cardlist/card/EB01-046.png",
      english: "https://en.onepiece-cardgame.com/images/cardlist/card/EB01-046.png"
    },
    {
      name: "ST01-001 (test case)",
      original: "https://asia-en.onepiece-cardgame.com/images/cardlist/card/ST01-001.png",
      english: "https://en.onepiece-cardgame.com/images/cardlist/card/ST01-001.png"
    }
  ];

  const testImageExists = async (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(false), 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

      img.src = url;
    });
  };

  const runTests = async () => {
    const results = [];

    for (const testUrl of testUrls) {
      const originalExists = await testImageExists(testUrl.original);
      const englishExists = await testImageExists(testUrl.english);

      results.push({
        ...testUrl,
        originalExists,
        englishExists,
        expectedBehavior: englishExists ? 'Use English' : 'Use Original'
      });
    }

    setTestResults(results);
  };

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">English URL Test</Text>
          <Button onClick={runTests} size="sm" colorScheme="blue">
            Run Tests
          </Button>
        </HStack>

        {testResults.map((result, index) => (
          <Box key={index} p={3} bg="white" borderRadius="md" border="1px" borderColor="gray.300">
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="bold">{result.name}</Text>

              <HStack spacing={4}>
                <Badge colorScheme={result.originalExists ? 'green' : 'red'}>
                  Original: {result.originalExists ? 'EXISTS' : 'MISSING'}
                </Badge>
                <Badge colorScheme={result.englishExists ? 'green' : 'red'}>
                  English: {result.englishExists ? 'EXISTS' : 'MISSING'}
                </Badge>
                <Badge colorScheme="blue">
                  Expected: {result.expectedBehavior}
                </Badge>
              </HStack>

              <HStack spacing={4}>
                <Box>
                  <Text fontSize="sm" mb={1}>CardImage Component:</Text>
                  <CardImage
                    src={result.original}
                    alt={result.name}
                    width="120px"
                    height="168px"
                  />
                </Box>

                <VStack align="start" fontSize="xs" color="gray.600">
                  <Text><strong>Original:</strong> {result.original}</Text>
                  <Text><strong>English:</strong> {result.english}</Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>
        ))}

        {testResults.length === 0 && (
          <Text color="gray.500" textAlign="center">
            Click "Run Tests" to check URL availability
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default EnglishUrlTest;
