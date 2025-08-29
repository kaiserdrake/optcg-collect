// Custom API Error class for better error handling
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffFactor: 2,
};

// Sleep utility for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
const retry = async (operation, customMaxRetries = RETRY_CONFIG.maxRetries) => {
  let lastError;

  for (let attempt = 0; attempt <= customMaxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) except for 408 (timeout)
      if (error instanceof APIError && error.status >= 400 && error.status < 500 && error.status !== 408) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === customMaxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
        RETRY_CONFIG.maxDelay
      );

      console.log(`API call failed (attempt ${attempt + 1}/${customMaxRetries + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
};

// Core fetch function with error handling
const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  // Add timeout (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle different response types
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new APIError('Authentication required', response.status, 'NO_TOKEN');
      } else if (response.status === 403) {
        throw new APIError('Token expired', response.status, 'TOKEN_EXPIRED');
      } else {
        throw new APIError(data.message || data || `HTTP ${response.status}`, response.status, 'HTTP_ERROR');
      }
    }

    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Unable to connect to server. Make sure the backend is running.', 0, 'NETWORK_ERROR');
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
    deleteCollection: () => api.delete('/api/users/me/collection'), // New method
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
    case 'HTTP_ERROR':
      return 'Server returned an error. Please try again.';
    default:
      return error.message || 'An unexpected error occurred';
  }
};
