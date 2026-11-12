import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiGet, apiPost } from "./api";
import { refreshCsrfToken } from "./csrf";
import type { AuthUser, RegisterPayload } from "../types/api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const current = await apiGet<AuthUser>("/auth/me/");
      setUser(current);
      setStatus("authenticated");
      return current;
    } catch {
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    // A CSRF token is needed before the first write (logout, profile update),
    // so warm it up while we ask who is signed in.
    void refreshCsrfToken();

    apiGet<AuthUser>("/auth/me/")
      .then((current) => {
        if (!active) {
          return;
        }
        setUser(current);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const nextUser = await apiPost<AuthUser>("/auth/login/", { email, password });
    // Django rotates the session and CSRF token on login.
    await refreshCsrfToken();
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const nextUser = await apiPost<AuthUser>("/auth/register/", payload);
    await refreshCsrfToken();
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost<null>("/auth/logout/", {});
    } finally {
      await refreshCsrfToken();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refreshUser }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
