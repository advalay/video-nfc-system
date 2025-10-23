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
  shopName?: string;
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

  // 初回マウント時に認証状態を確認
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Cognito認証状態の確認
  const checkAuthStatus = async () => {
    try {
      configureAmplify();
      
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      
      if (!idToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const groups = (idToken?.payload?.['cognito:groups'] as string[]) || [];
      
      // idTokenから直接カスタム属性を取得（より確実）
      const organizationId = idToken?.payload?.['custom:organizationId'] as string;
      const shopId = idToken?.payload?.['custom:shopId'] as string;
      const organizationName = idToken?.payload?.['custom:organizationName'] as string;
      const shopName = idToken?.payload?.['custom:shopName'] as string;
      
      // フォールバック: currentUserのattributesも試す
      const attributes = (currentUser as any).attributes || {};
      
      // デバッグログ: 本番環境での値を確認
      console.log('🔍 [useAuth] IDトークンから取得した値:', {
        organizationId,
        shopId,
        organizationName,
        shopName,
        groups,
        email: idToken?.payload?.email
      });
      
      console.log('🔍 [useAuth] Attributesから取得した値:', {
        organizationId: attributes['custom:organizationId'],
        shopId: attributes['custom:shopId'],
        organizationName: attributes['custom:organizationName'],
        shopName: attributes['custom:shopName']
      });
      
      const userData = {
        id: currentUser.username,
        email: (idToken?.payload?.email as string) || attributes.email || currentUser.username,
        groups: groups,
        organizationId: organizationId || attributes['custom:organizationId'],
        shopId: shopId || attributes['custom:shopId'],
        organizationName: organizationName || attributes['custom:organizationName'],
        shopName: shopName || attributes['custom:shopName'],
      };
      
      console.log('🔍 [useAuth] 最終的なuserData:', userData);
      
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.log('認証状態確認エラー:', error);
      // 未認証の場合
      setUser(null);
      setIsLoading(false);
      console.log('checkAuthStatus: エラーで完了');
    }
  };

  const login = async (email: string, password: string) => {
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
