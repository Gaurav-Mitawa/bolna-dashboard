/**
 * Auth Context — Backend Session-Based Authentication
 * Uses /api/auth/me to check session state (Google OAuth via Passport.js)
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  bolnaKeySet: boolean;
  subscriptionStatus: 'inactive' | 'trial' | 'active' | 'expired';
  subscriptionExpiresAt: string | null;
  isSubscriptionActive: boolean;
  trialExpiresAt: string | null;
  trialStartedAt: string | null;
  // Legacy fields — kept for backwards compat with existing components
  wallet_balance?: number;
  wallet?: number;
}

interface AuthContextType {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (res.status === 401) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch user session');
      }

      const data = await res.json();

      if (data.authenticated === false) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(data);
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication error');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    refetchUser: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
