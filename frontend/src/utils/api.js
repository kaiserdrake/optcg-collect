// utils/api.js

// Get API URL with fallbacks for different environments
const getAPIBaseURL = () => {
  // Browser environment - always use localhost
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // Server environment - can use container names
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_BASE_URL = getAPIBaseURL();

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

// Sleep utility for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
const retry = async (fn, retries = 3, baseDelay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        throw error;
      }

      // Don't retry on the last attempt
      if (i === retries - 1) {
        throw error;
      }

      // Exponential backoff: baseDelay * 2^i + random jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.warn(`API request failed (attempt ${i + 1}/${retries}), retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
};

// Enhanced fetch function with better error handling
const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  console.log(`[API] Making request to: ${url}`);

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`[API] Response status: ${response.status} for ${url}`);

    // Handle different response types
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.message || data || `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = data?.code || 'UNKNOWN_ERROR';
      throw new APIError(errorMessage, response.status, errorCode);
    }

    return data;
  } catch (error) {
    console.error(`[API] Request failed for ${url}:`, error);

    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Network error: Unable to connect to server. Make sure the backend is running.', 0, 'NETWORK_ERROR');
    }

    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408, 'TIMEOUT_ERROR');
    }

    throw new APIError(error.message || 'Unknown error occurred', 0, 'UNKNOWN_ERROR');
  }
};

// API methods with retry logic
export const api = {
  // GET request with retry
  get: async (endpoint, options = {}) => {
    return retry(() => apiFetch(endpoint, { method: 'GET', ...options }));
  },

  // POST request with retry
  post: async (endpoint, data, options = {}) => {
    return retry(() => apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    }));
  },

  // PUT request with retry
  put: async (endpoint, data, options = {}) => {
    return retry(() => apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    }));
  },

  // DELETE request with retry
  delete: async (endpoint, options = {}) => {
    return retry(() => apiFetch(endpoint, { method: 'DELETE', ...options }));
  },

  // Search cards (with specific error handling)
  searchCards: async (params) => {
    const searchParams = new URLSearchParams(params);
    return retry(() => apiFetch(`/api/cards/search?${searchParams.toString()}`), 2); // Fewer retries for search
  },

  // Update collection (with specific error handling)
  updateCollection: async (data) => {
    return retry(() => apiFetch('/api/collection/update', {
      method: 'POST',
      body: JSON.stringify(data)
    }), 2); // Fewer retries for updates to avoid duplicate operations
  },

  // Login (no retry to avoid account lockout)
  login: async (credentials) => {
    return apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Test connection
  testConnection: async () => {
    return apiFetch('/api/health');
  },

  // User management
  users: {
    list: () => api.get('/api/users'),
    create: (userData) => api.post('/api/users', userData),
    delete: (userId) => api.delete(`/api/users/${userId}`),
    changePassword: (userId, passwordData) => api.put(`/api/users/${userId}/password`, passwordData),
    me: () => api.get('/api/users/me'),
    updatePassword: (passwordData) => api.put('/api/users/change-password', passwordData),
    deleteAccount: () => api.delete('/api/users/me'),
  }
};

// Error message mapping for better user experience
export const getErrorMessage = (error) => {
  if (!(error instanceof APIError)) {
    return 'An unexpected error occurred';
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Unable to connect to server. Please check if the backend is running and try again.';
    case 'TIMEOUT_ERROR':
      return 'Request timed out. The server might be overloaded, please try again.';
    case 'NO_TOKEN':
      return 'Please log in to continue.';
    case 'TOKEN_EXPIRED':
      return 'Your session has expired. Please log in again.';
    case 'INSUFFICIENT_PRIVILEGES':
      return 'You do not have permission to perform this action.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment before trying again.';
    default:
      return error.message || 'An error occurred';
  }
};

// Hook for handling API errors consistently
export const useErrorHandler = (toast) => {
  return (error) => {
    const message = getErrorMessage(error);

    console.error('[API Error]', error);

    toast({
      title: 'Error',
      description: message,
      status: 'error',
      duration: error.status === 401 ? 3000 : 5000,
      isClosable: true,
    });

    // Redirect to login if unauthorized
    if (error.status === 401) {
      // You might want to use router here
      window.location.href = '/login';
    }
  };
};
