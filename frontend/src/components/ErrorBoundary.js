'use client';

import React from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="100vh"
          p={4}
        >
          <VStack spacing={4} textAlign="center">
            <Heading size="lg">Something went wrong</Heading>
            <Text>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </Text>
            <Button
              colorScheme="blue"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Box
                as="pre"
                p={4}
                bg="red.50"
                borderRadius="md"
                fontSize="sm"
                textAlign="left"
                overflow="auto"
                maxW="100%"
              >
                {this.state.error?.toString()}
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
