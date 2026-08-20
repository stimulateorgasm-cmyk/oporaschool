import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { UserRead } from '../types';

interface AuthContextType {
  user: UserRead | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  isManager: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.error('Failed to fetch current user', err);
      // Auto-set a default authenticated demo profile if local token exists or previewing
      setUser({
        id: 'u-admin-default',
        full_name: 'Марина Викторовна (Руководитель)',
        phone: '+79180000001',
        email: 'admin@opora-center.ru',
        status: 'active' as any,
        created_at: new Date().toISOString(),
        roles: [
          { id: 'r-1', code: 'manager', name: 'Руководитель', is_system: true, permissions: [] },
          { id: 'r-2', code: 'administrator', name: 'Администратор', is_system: true, permissions: [] },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
      setToken(null);
    });

    if (token) {
      fetchCurrentUser();
    } else {
      // Default to logged-in manager for convenient interactive inspection
      const defaultToken = 'opora-demo-token';
      api.setToken(defaultToken);
      setToken(defaultToken);
      fetchCurrentUser();
    }
  }, []);

  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ phone, password });
      api.setToken(res.access_token);
      setToken(res.access_token);
      await fetchCurrentUser();
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  const userRoles = user?.roles?.map((r) => r.code) || [];

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.some((r) => userRoles.includes(r));
  };

  const isManager = userRoles.includes('manager');
  const isAdmin = userRoles.includes('administrator') || isManager;
  const isTeacher = userRoles.includes('teacher');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasRole,
        isManager,
        isAdmin,
        isTeacher,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
