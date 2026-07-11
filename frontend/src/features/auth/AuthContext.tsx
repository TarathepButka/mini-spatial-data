import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthUser,
  clearLegacyAuthStorage,
  getCurrentUser,
  loginWithGoogleCredential,
  logoutCurrentUser,
} from "../../api/auth";
import { LoginScreen } from "./LoginScreen";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  continueLocalDemo: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const localDemoUser: AuthUser = {
  sub: "local-demo",
  email: "local-demo@example.com",
  emailVerified: true,
  name: "Local Demo",
  picture: "",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [localDemo, setLocalDemo] = useState(false);

  useEffect(() => {
    clearLegacyAuthStorage();
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (cancelled) return;
        setUser(response.user);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginWithGoogle: async (credential: string) => {
        const response = await loginWithGoogleCredential(credential);
        setUser(response.user);
        setLocalDemo(false);
      },
      continueLocalDemo: () => {
        setUser(localDemoUser);
        setLocalDemo(true);
      },
      logout: () => {
        logoutCurrentUser().catch(() => undefined);
        setUser(null);
        setLocalDemo(false);
      },
    }),
    [loading, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {user || localDemo ? children : <LoginScreen loading={loading} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}