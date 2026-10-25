import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ClerkProvider, useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { UserProfile } from '../types';
import { syncUserWithBackend } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  clerkKeyConfigured: boolean;
  setClerkPublishableKey: (key: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLERK_KEY_STORAGE = 'reachinbox_clerk_pk';
const USER_KEY_STORAGE = 'reachinbox_user_data';

/** Internal component that runs *inside* ClerkProvider when a valid key is provided */
const ClerkAuthConsumer: React.FC<{
  children: React.ReactNode;
  clerkKeyConfigured: boolean;
  setClerkPublishableKey: (key: string) => void;
}> = ({ children, clerkKeyConfigured, setClerkPublishableKey }) => {
  const { isLoaded: isUserLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useClerkAuth();
  const { signOut } = useClerk();

  const [syncedUser, setSyncedUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY_STORAGE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(null);

  // Sync Clerk user with backend / MongoDB Atlas when signed in
  useEffect(() => {
    let active = true;

    async function sync() {
      if (!isUserLoaded || !isSignedIn || !clerkUser) {
        if (isUserLoaded && !isSignedIn) {
          setSyncedUser(null);
          setToken(null);
          localStorage.removeItem(USER_KEY_STORAGE);
          localStorage.removeItem('reachinbox_jwt_token');
        }
        return;
      }

      try {
        const sessionToken = await getToken();
        if (sessionToken && active) {
          setToken(sessionToken);
          localStorage.setItem('reachinbox_jwt_token', sessionToken);
        }

        const email =
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses[0]?.emailAddress ||
          '';

        const name =
          clerkUser.fullName ||
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
          email.split('@')[0];

        const avatar = clerkUser.imageUrl;

        const dbUser = await syncUserWithBackend({
          clerkId: clerkUser.id,
          email,
          name,
          avatar,
        });

        if (active) {
          setSyncedUser(dbUser);
          localStorage.setItem(USER_KEY_STORAGE, JSON.stringify(dbUser));
        }
      } catch (err) {
        // Fallback to local profile if backend sync is deferred
        if (active && clerkUser) {
          const fallbackUser: UserProfile = {
            id: clerkUser.id,
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            avatar: clerkUser.imageUrl,
          };
          setSyncedUser(fallbackUser);
        }
      }
    }

    sync();

    return () => {
      active = false;
    };
  }, [isUserLoaded, isSignedIn, clerkUser, getToken]);

  const logout = useCallback(async () => {
    localStorage.removeItem(USER_KEY_STORAGE);
    localStorage.removeItem('reachinbox_jwt_token');
    setSyncedUser(null);
    setToken(null);
    await signOut();
  }, [signOut]);

  const authValue: AuthContextType = useMemo(
    () => ({
      user: syncedUser,
      token,
      isAuthenticated: Boolean(isSignedIn),
      loading: !isUserLoaded || !isAuthLoaded,
      clerkKeyConfigured,
      setClerkPublishableKey,
      logout,
    }),
    [syncedUser, token, isSignedIn, isUserLoaded, isAuthLoaded, clerkKeyConfigured, setClerkPublishableKey, logout]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

/** Top-level AuthProvider that mounts ClerkProvider if key is present */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clerkKey, setClerkKey] = useState<string>(() => {
    const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    if (envKey && envKey.trim().length > 0) return envKey.trim();
    try {
      return localStorage.getItem(CLERK_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });

  const handleSetClerkKey = useCallback((newKey: string) => {
    const trimmed = newKey.trim();
    setClerkKey(trimmed);
    try {
      localStorage.setItem(CLERK_KEY_STORAGE, trimmed);
    } catch {
      // ignore
    }
  }, []);

  const isValidClerkKey = Boolean(clerkKey && clerkKey.startsWith('pk_'));

  if (!isValidClerkKey) {
    const fallbackValue: AuthContextType = {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      clerkKeyConfigured: false,
      setClerkPublishableKey: handleSetClerkKey,
      logout: async () => {},
    };

    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ClerkAuthConsumer
        clerkKeyConfigured={true}
        setClerkPublishableKey={handleSetClerkKey}
      >
        {children}
      </ClerkAuthConsumer>
    </ClerkProvider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
