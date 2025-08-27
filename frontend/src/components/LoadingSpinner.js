'use client';

import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

const LoadingSpinner = ({ message = "Loading...", size = "xl", showMessage = true }) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minH="200px"
      py={8}
    >
      <VStack spacing={4}>
        <Spinner
          size={size}
          color="blue.500"
          thickness="4px"
          speed="0.65s"
        />
        {showMessage && (
          <Text color="gray.600" fontSize="md">
            {message}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default LoadingSpinner;
