import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthUser,
  clearLegacyAuthStorage,
  getCurrentUser,
  loginWithGoogleCredential,
  logoutCurrentUser,
  switchCurrentRole,
} from "../../api/auth";
import { LoginScreen } from "./LoginScreen";
import {
  permissionFlagsForUser,
  type PermissionFlags,
} from "./permissionFlags";

type AuthContextValue = {
  user: AuthUser | null;
  permissionFlags: PermissionFlags;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  switchRole: (role: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearLegacyAuthStorage();
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setUser(response.user);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissionFlags: permissionFlagsForUser(user),
      loading,
      loginWithGoogle: async (credential: string) => {
        const response = await loginWithGoogleCredential(credential);
        setUser(response.user);
      },
      switchRole: async (role: string) => {
        const response = await switchCurrentRole(role);
        setUser(response.user);
      },
      logout: () => {
        logoutCurrentUser().catch(() => undefined);
        setUser(null);
      },
    }),
    [loading, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {user ? children : <LoginScreen loading={loading} />}
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
