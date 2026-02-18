/**
 * Base API client with interceptors and error handling.
 * Provides foundation for all API calls.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// API version configuration
export const API_CONFIG = {
  v1: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    version: 'v1',
  },
  v2: {
    baseURL: import.meta.env.VITE_API_V2_BASE_URL || 'http://localhost:8000/api',
    version: 'v2',
  },
};

// Response wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Create axios instance with interceptors.
 */
export function createApiClient(version: 'v1' | 'v2' = 'v1'): AxiosInstance {
  const config = API_CONFIG[version];
  
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[${version.toUpperCase()} API] ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors globally
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      handleApiError(error);
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Global error handler.
 */
function handleApiError(error: AxiosError) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;
    
    switch (status) {
      case 401:
        console.error('Unauthorized - clearing auth token');
        localStorage.removeItem('jwtToken');
        // Note: This app uses Bolna API key authentication
        // The AuthContext will handle the authentication state
        break;
        
      case 403:
        console.error('Forbidden:', data?.error);
        break;
        
      case 404:
        console.error('Not found:', data?.error);
        break;
        
      case 422:
        console.error('Validation error:', data?.detail);
        break;
        
      case 500:
        console.error('Server error:', data?.error);
        break;
        
      default:
        console.error('API error:', data?.error || error.message);
    }
  } else if (error.request) {
    console.error('Network error - unable to connect to server');
  } else {
    console.error('API Error:', error.message);
  }
}

/**
 * Retry wrapper for failed requests.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// Export singleton instances
export const apiClientV1 = createApiClient('v1');
export const apiClientV2 = createApiClient('v2');

