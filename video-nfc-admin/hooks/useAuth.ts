'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';

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
    // 認証をスキップしてパートナー親のユーザー情報を設定
    console.log('Setting partner parent user for testing');
    setUser({
      id: 'orga-admin-001',
      email: 'orga-admin@example.com',
      groups: ['organization-admin']
    });
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      configureAmplify();
      await signIn({ username: email, password });
      
      // ログイン成功後、ユーザー情報を再取得
      const currentUser = await getCurrentUser();
      const groups = (currentUser as any).signInUserSession?.idToken?.payload?.['cognito:groups'] || [];
      
      setUser({
        id: currentUser.username,
        email: currentUser.username,
        groups: groups
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      configureAmplify();
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };
}
