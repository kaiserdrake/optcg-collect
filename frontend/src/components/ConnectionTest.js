'use client';

import { useState } from 'react';
import { Box, Button, Text, VStack, Code, HStack, Badge, Divider } from '@chakra-ui/react';

const ConnectionTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const addResult = (test, result) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testConnection = async () => {
    setLoading(true);
    setResults([]);

    // Test 1: Environment Variables
    addResult('Environment Check', {
      success: true,
      data: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        computed_API_URL: API_URL,
        window_location: typeof window !== 'undefined' ? window.location.href : 'server-side'
      }
    });

    // Test 2: Basic Fetch
    try {
      console.log('[ConnectionTest] Testing basic fetch to:', `${API_URL}/api/health`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      const data = await response.text();
      let parsedData;

      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      addResult('Health Endpoint (/api/health)', {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries())
      });

    } catch (error) {
      console.error('[ConnectionTest] Health check failed:', error);
      addResult('Health Endpoint (/api/health)', {
        success: false,
        error: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    }

    // Test 3: Login Endpoint (without credentials)
    try {
      console.log('[ConnectionTest] Testing login endpoint...');

      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail: 'test', password: 'test' })
      });

      const data = await response.text();
      let parsedData;

      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      addResult('Login Endpoint (/api/login)', {
        success: response.status !== 0, // Any response is better than no response
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        note: 'Expected to fail with 401, but connection should work'
      });

    } catch (error) {
      console.error('[ConnectionTest] Login test failed:', error);
      addResult('Login Endpoint (/api/login)', {
        success: false,
        error: error.message,
        name: error.name,
        note: 'This suggests a connection problem'
      });
    }

    // Test 4: Container Network Test
    if (typeof window !== 'undefined') {
      try {
        // Test if we can reach the container name directly (should fail from browser)
        const response = await fetch('http://opcc-backend:3001/api/health', {
          method: 'GET',
          mode: 'no-cors' // This will prevent CORS errors but we won't get response data
        });

        addResult('Container Name Test (opcc-backend:3001)', {
          success: false,
          note: 'This should fail from browser - containers are not accessible by name from browser'
        });
      } catch (error) {
        addResult('Container Name Test (opcc-backend:3001)', {
          success: true, // This should fail, so error is expected
          error: error.message,
          note: 'This is expected to fail - browser cannot reach container names'
        });
      }
    }

    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Box p={6} border="2px" borderColor="blue.200" borderRadius="lg" bg="blue.50">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold" color="blue.800">
          🔧 API Connection Debug Tool
        </Text>

        <HStack>
          <Button onClick={testConnection} isLoading={loading} colorScheme="blue">
            Run Connection Tests
          </Button>
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        </HStack>

        <Box>
          <Text fontWeight="semibold" mb={2}>Current Configuration:</Text>
          <Code p={2} display="block" fontSize="sm">
            API_URL: {API_URL}
          </Code>
        </Box>

        {results.length > 0 && (
          <Box>
            <Divider my={4} />
            <Text fontWeight="bold" mb={4}>Test Results:</Text>

            <VStack spacing={4} align="stretch">
              {results.map((result, index) => (
                <Box key={index} p={4} border="1px" borderColor="gray.300" borderRadius="md" bg="white">
                  <HStack mb={2}>
                    <Badge colorScheme={result.result.success ? 'green' : 'red'}>
                      {result.result.success ? 'PASS' : 'FAIL'}
                    </Badge>
                    <Text fontWeight="semibold">{result.test}</Text>
                    <Text fontSize="sm" color="gray.500">{result.timestamp}</Text>
                  </HStack>

                  <Code p={3} display="block" whiteSpace="pre-wrap" fontSize="xs" maxH="200px" overflow="auto">
                    {JSON.stringify(result.result, null, 2)}
                  </Code>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        <Box mt={4} p={4} bg="yellow.100" borderRadius="md">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>💡 Debug Tips:</Text>
          <VStack align="start" spacing={1} fontSize="sm">
            <Text>• If health endpoint fails: Backend container might not be accessible</Text>
            <Text>• If you see CORS errors: Check if backend is running on the expected port</Text>
            <Text>• If timeout errors: Backend might be overloaded or not responding</Text>
            <Text>• Check browser dev tools Network tab for more details</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default ConnectionTest;
