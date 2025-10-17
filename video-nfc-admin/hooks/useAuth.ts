'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  groups: string[];
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 開発環境ではモックユーザーを設定
    if (process.env.NODE_ENV === 'development') {
      setUser({
        id: 'dev-user',
        email: 'dev@example.com',
        groups: ['system-admin']
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // 実際の認証ロジックを実装
    console.log('Login attempt:', email);
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };
}
