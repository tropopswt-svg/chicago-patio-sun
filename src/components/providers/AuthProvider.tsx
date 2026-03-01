"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { SafeUser } from "@/lib/types";

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  toggleFavorite: (patioId: string) => void;
  isFavorite: (patioId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    setUser(data.user);
    return null;
  }, []);

  const signup = useCallback(async (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<string | null> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Signup failed";
    setUser(data.user);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const toggleFavorite = useCallback((patioId: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const favorites = prev.favorites.includes(patioId)
        ? prev.favorites.filter((id) => id !== patioId)
        : [...prev.favorites, patioId];
      return { ...prev, favorites };
    });

    // Fire and forget — optimistic update above, sync in background
    fetch("/api/auth/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patioId }),
    }).catch(() => {
      // Revert on failure
      setUser((prev) => {
        if (!prev) return prev;
        const favorites = prev.favorites.includes(patioId)
          ? prev.favorites.filter((id) => id !== patioId)
          : [...prev.favorites, patioId];
        return { ...prev, favorites };
      });
    });
  }, []);

  const isFavorite = useCallback(
    (patioId: string) => user?.favorites.includes(patioId) ?? false,
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, toggleFavorite, isFavorite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
