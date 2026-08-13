import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = 'auth_session_token';

interface User {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // The redirect URI is stable across renders — computed once
  const redirectUri = AuthSession.makeRedirectUri();

  const fetchUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async () => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      console.error('API base URL (EXPO_PUBLIC_DOMAIN) is not configured.');
      return;
    }

    try {
      // Step 1: Ask the server to generate all OIDC crypto material (nonce,
      // state, PKCE code verifier) and return a signed transaction token + the
      // full authorization URL.
      const beginRes = await fetch(`${apiBase}/api/mobile-auth/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      });
      if (!beginRes.ok) {
        console.error('Failed to begin mobile auth:', beginRes.status);
        return;
      }
      const { transactionToken, authUrl } = await beginRes.json() as {
        transactionToken: string;
        authUrl: string;
      };

      // Step 2: Open the authorization URL in the system browser.
      // The OS will redirect back to the app via the custom scheme when done.
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success' || !result.url) {
        // User cancelled or browser closed without a successful redirect
        return;
      }

      // Step 3: Parse the authorization code and state from the redirect URL
      const redirectUrl = new URL(result.url);
      const code = redirectUrl.searchParams.get('code');
      if (!code) {
        console.error('No authorization code in redirect URL');
        return;
      }

      // Step 4: Exchange the code + opaque transaction token for a session.
      // The server verifies the transaction signature and uses its stored
      // nonce/state/code_verifier — nothing sensitive comes from the client.
      const exchangeRes = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, transactionToken }),
      });

      if (!exchangeRes.ok) {
        console.error('Token exchange failed:', exchangeRes.status);
        return;
      }

      const data = await exchangeRes.json();
      if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        setIsLoading(true);
        await fetchUser();
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  }, [redirectUri, fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
