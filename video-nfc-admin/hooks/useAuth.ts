'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';

interface User {
  id: string;
  email: string;
  groups: string[];
  organizationId?: string;
  shopId?: string;
  organizationName?: string;
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: (userType: 'system-admin' | 'organization-admin' | 'shop-user') => void;
}

// テストユーザーのマップ定義
const TEST_USER_MAP = {
  'system-admin': {
    id: 'system-admin-001',
    email: 'system-admin@example.com',
    groups: ['system-admin'],
    organizationId: 'SYSTEM',
    organizationName: 'システム管理',
  },
  'organization-admin': {
    id: 'orga-admin-001',
    email: 'orga-admin@example.com',
    groups: ['organization-admin'],
    organizationId: 'ORG_A',
    organizationName: 'パートナー企業A',
  },
  'shop-user': {
    id: 'shop-a1-001',
    email: 'shop-a1@example.com',
    groups: ['shop-user'],
    organizationId: 'ORG_A',
    shopId: 'SHOP_A1',
    organizationName: 'パートナー企業A',
  }
};

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isMockMode = process.env.NEXT_PUBLIC_AUTH_MODE === 'mock';

  // Mock mode: テストユーザーの初期化と同期
  useEffect(() => {
    if (!isMockMode) {
      // Cognito認証モードの場合は認証状態を確認
      checkAuthStatus();
      return;
    }

    // Mock mode: localStorageからユーザータイプを読み込み
    const handleStorageChange = () => {
      const currentUserType = localStorage.getItem('currentUserType') || 'system-admin';
      setUser(TEST_USER_MAP[currentUserType as keyof typeof TEST_USER_MAP]);
      setIsLoading(false);
    };

    // 初回読み込み
    handleStorageChange();
    
    // カスタムイベントを監視
    window.addEventListener('userTypeChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('userTypeChanged', handleStorageChange);
    };
  }, [isMockMode]);

  // Cognito認証状態の確認
  const checkAuthStatus = async () => {
    try {
      configureAmplify();
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = (session.tokens?.idToken?.payload?.['cognito:groups'] as string[]) || [];
      
      // Cognitoのカスタム属性から組織情報を取得
      const attributes = (currentUser as any).attributes || {};
      
      setUser({
        id: currentUser.username,
        email: attributes.email || currentUser.username,
        groups: groups,
        organizationId: attributes['custom:organizationId'],
        shopId: attributes['custom:shopId'],
        organizationName: attributes['custom:organizationName'],
      });
      setIsLoading(false);
    } catch (error) {
      // 未認証の場合
      setUser(null);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (isMockMode) {
      // Mock mode: ダミーログイン
      const userType = email.includes('system') ? 'system-admin' 
        : email.includes('orga') ? 'organization-admin' 
        : 'shop-user';
      
      setUser(TEST_USER_MAP[userType]);
      localStorage.setItem('currentUserType', userType);
      return;
    }

    // Cognito認証
    try {
      configureAmplify();
      await signIn({ username: email, password });
      
      // ログイン成功後、ユーザー情報を再取得
      await checkAuthStatus();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    if (isMockMode) {
      // Mock mode: ユーザー情報をクリア
      setUser(null);
      localStorage.removeItem('currentUserType');
      return;
    }

    // Cognito認証
    try {
      configureAmplify();
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const switchUser = (userType: 'system-admin' | 'organization-admin' | 'shop-user') => {
    if (!isMockMode) {
      console.warn('User switching is only available in mock mode');
      return;
    }

    setUser(TEST_USER_MAP[userType]);
    localStorage.setItem('currentUserType', userType);
    window.dispatchEvent(new Event('userTypeChanged'));
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    switchUser
  };
}
