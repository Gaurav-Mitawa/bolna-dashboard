/**
 * API Fetch Wrapper
 * Automatically adds Authorization header to all API calls
 * Handles 401 errors by clearing token and throwing error
 * Includes token expiry checking for better UX
 * Note: This app uses Bolna API key authentication, not JWT login flow
 */

// Get API base URL from environment variable or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Log API base URL in development to help debug
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

/**
 * Check if JWT token is expired (client-side check)
 * @param token - JWT token string
 * @returns true if expired, false if valid
 */
export function isTokenExpired(token: string): boolean {
  try {
    // JWT structure: header.payload.signature
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() > expiry;
  } catch {
    return true; // If we can't parse, treat as expired
  }
}

/**
 * Get auth token from localStorage
 * Automatically removes expired tokens
 * @returns Token string or null if not found/expired
 */
export function getAuthToken(): string | null {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    return null;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    localStorage.removeItem("auth_token");
    return null;
  }

  return token;
}

/**
 * Save auth token to localStorage
 * @param token - JWT token string
 */
export function saveAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  localStorage.removeItem("auth_token");
}

/**
 * Fetch wrapper that automatically adds Authorization header and base URL
 * 
 * @param url - API endpoint URL (relative or absolute)
 * @param options - Fetch options (method, body, etc.)
 * @returns Response object
 */
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken(); // Use helper that checks expiry

  // Create a mutable copy of headers as Record<string, string>
  // Note: This assumes options.headers is object-like, which is safest for fetch wrapper
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}` as string;
  }

  // Construct full URL (if relative, prepend base URL)
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Clear token on 401 Unauthorized but don't redirect
    // The AuthContext will handle authentication state
    if (response.status === 401) {
      clearAuthToken();
    }

    return response;
  } catch (error) {
    // Enhanced error logging for debugging
    console.error('API Request Failed:', {
      url: fullUrl,
      baseUrl: API_BASE_URL,
      error: error instanceof Error ? error.message : String(error),
      isLocalhost: API_BASE_URL.includes('localhost'),
    });

    // If using localhost in production, provide helpful error message
    if (API_BASE_URL.includes('localhost') && !import.meta.env.DEV) {
      throw new Error(
        'API configuration error: VITE_API_BASE_URL is not set. ' +
        'Please set VITE_API_BASE_URL environment variable in Vercel to your backend URL.'
      );
    }

    throw error;
  }
};

/**
 * Helper to get auth headers object (for libraries like React Query)
 * 
 * @returns Headers object with Authorization and Content-Type
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken(); // Use helper that checks expiry
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Custom error for API key decryption failures
 * Status code 498 indicates the VAPI API key cannot be decrypted
 * User needs to reconnect VAPI to fix this
 */
export class ApiKeyDecryptionError extends Error {
  constructor(
    message: string,
    public readonly actionRequired: string = "reconnect_vapi",
    public readonly errorCode: string = "API_KEY_DECRYPTION_FAILED"
  ) {
    super(message);
    this.name = "ApiKeyDecryptionError";
  }
}

/**
 * Helper to make authenticated API calls with JSON response
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws ApiKeyDecryptionError if status is 498 (decryption failed)
 */
export const authFetchJson = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await authFetch(url, options);

  if (!response.ok) {
    // Check for decryption failure (status 498)
    if (response.status === 498) {
      const errorData = await response.json().catch(() => ({
        message: "API key decryption failed. Please reconnect VAPI.",
        action_required: "reconnect_vapi"
      }));

      throw new ApiKeyDecryptionError(
        errorData.message || "Your VAPI API key cannot be decrypted. Please reconnect VAPI.",
        errorData.action_required || "reconnect_vapi",
        errorData.error || "API_KEY_DECRYPTION_FAILED"
      );
    }

    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
};

