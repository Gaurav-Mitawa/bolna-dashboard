/**
 * User State Query Hook
 * Centralized React Query hook for fetching and managing user state
 * 
 * ✅ FIX 3: Provides consistent user state management across the app
 * Uses React Query for automatic caching, refetching, and invalidation
 */

import { useQuery } from "@tanstack/react-query";
import { authFetchJson } from "@/lib/api";

/**
 * User information from /api/auth/me endpoint
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  voice_provider?: string | null;
  vapi_phone_number?: string | null;
  has_connected_provider: boolean;
  connected_providers: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * React Query hook for fetching current user information
 * 
 * @returns Query result with user data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { data: user, isLoading, error } = useUser();
 * 
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * if (!user?.has_connected_provider) return <ConnectProviderModal />;
 * ```
 */
export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => authFetchJson<UserInfo>("/api/auth/me"),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });
}

