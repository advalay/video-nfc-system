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
      console.log('🔍 [useAuth] checkAuthStatus: 開始');
      configureAmplify();
      console.log('🔍 [useAuth] Amplify設定完了');
      
      const currentUser = await getCurrentUser();
      console.log('🔍 [useAuth] 現在のユーザー取得完了', currentUser);
      
      const session = await fetchAuthSession();
      console.log('🔍 [useAuth] セッション取得完了', session);
      
      const idToken = session.tokens?.idToken;
      console.log('🔍 [useAuth] idToken取得:', !!idToken);
      
      if (!idToken) {
        console.error('❌ [useAuth] idTokenが取得できません');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const groups = (idToken?.payload?.['cognito:groups'] as string[]) || [];
      console.log('🔍 [useAuth] groups取得:', groups);
      
      // idTokenから直接カスタム属性を取得（より確実）
      const organizationId = idToken?.payload?.['custom:organizationId'] as string;
      const shopId = idToken?.payload?.['custom:shopId'] as string;
      const organizationName = idToken?.payload?.['custom:organizationName'] as string;
      
      // フォールバック: currentUserのattributesも試す
      const attributes = (currentUser as any).attributes || {};
      
      const userData = {
        id: currentUser.username,
        email: (idToken?.payload?.email as string) || attributes.email || currentUser.username,
        groups: groups,
        organizationId: organizationId || attributes['custom:organizationId'],
        shopId: shopId || attributes['custom:shopId'],
        organizationName: organizationName || attributes['custom:organizationName'],
      };
      
      console.log('🔍 [useAuth] useAuth Debug:', {
        currentUser: currentUser.username,
        idTokenPayload: idToken?.payload,
        attributes: attributes,
        groups: groups,
        userData: userData,
        organizationId: userData.organizationId,
        organizationName: userData.organizationName
      });
      
      console.log('🔍 [useAuth] ユーザーデータ設定', userData);
      setUser(userData);
      setIsLoading(false);
      console.log('🔍 [useAuth] 完了');
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
