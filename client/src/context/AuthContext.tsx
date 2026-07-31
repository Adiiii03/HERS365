import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'athlete' | 'coach' | 'parent' | 'admin';
}

export type AuthStatus = 'authenticated' | 'pending' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  status: AuthStatus;
  pendingToken: string | null;
  setPending: (pendingToken: string) => void;
  clearPending: () => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [pendingToken, setPendingToken] = useState<string | null>(() => localStorage.getItem('pendingToken'));

  const setPending = useCallback((newPendingToken: string) => {
    localStorage.setItem('pendingToken', newPendingToken);
    setPendingToken(newPendingToken);
  }, []);

  const clearPending = useCallback(() => {
    localStorage.removeItem('pendingToken');
    setPendingToken(null);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.removeItem('pendingToken');
    setPendingToken(null);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const status: AuthStatus = token ? 'authenticated' : pendingToken ? 'pending' : 'unauthenticated';

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, status, pendingToken, setPending, clearPending, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
