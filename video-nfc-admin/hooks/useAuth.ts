'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signIn, signOut, confirmSignIn, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
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
  login: (email: string, password: string) => Promise<any>;
  confirmNewPassword: (newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
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

      const userData = {
        id: currentUser.username,
        email: (idToken?.payload?.email as string) || attributes.email || currentUser.username,
        groups: groups,
        organizationId: organizationId || attributes['custom:organizationId'],
        shopId: shopId || attributes['custom:shopId'],
        organizationName: organizationName || attributes['custom:organizationName'],
        shopName: shopName || attributes['custom:shopName'],
      };

      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.error('Auth check failed');
      // 未認証の場合
      setUser(null);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      configureAmplify();
      const result = await signIn({ username: email, password });

      // ログイン成功(セッション確立)後、ユーザー情報を再取得
      // パスワード変更が必要な場合などは、まだセッションがないため再取得してもnullになるが、
      // 呼び出し元でresult.nextStepを判定して処理する
      if (result.isSignedIn) {
        await checkAuthStatus();
      }

      return result;
    } catch (error) {
      throw error;
    }
  };

  const confirmNewPassword = async (newPassword: string) => {
    try {
      configureAmplify();
      await confirmSignIn({ challengeResponse: newPassword });
      await checkAuthStatus();
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      configureAmplify();
      await resetPassword({ username: email });
    } catch (error) {
      throw error;
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    try {
      configureAmplify();
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
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
    confirmNewPassword,
    forgotPassword,
    confirmForgotPassword,
    logout
  };
}
