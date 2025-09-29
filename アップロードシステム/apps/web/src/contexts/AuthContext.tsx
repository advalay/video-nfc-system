'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AdminProfile, LoginRequest, LoginResponse, ChangePasswordRequest } from '../types/admin';

interface AuthContextType {
  admin: AdminProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (passwords: ChangePasswordRequest) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'admin_access_token';
const PROFILE_KEY = 'admin_profile';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にローカルストレージから認証情報を復元
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedProfile = localStorage.getItem(PROFILE_KEY);

        if (storedToken && storedProfile) {
          setToken(storedToken);
          setAdmin(JSON.parse(storedProfile));
          
          // トークンの有効性を確認
          await refreshProfile();
        }
      } catch (error) {
        console.error('認証情報の復元に失敗しました:', error);
        // 無効な認証情報をクリア
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ログインに失敗しました');
      }

      const data: LoginResponse = await response.json();
      
      // 認証情報を保存
      setToken(data.accessToken);
      setAdmin(data.admin);
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.admin));
      
      return true;
    } catch (error) {
      console.error('ログインエラー:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      // 認証情報をクリア
      setToken(null);
      setAdmin(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
    }
  };

  const changePassword = async (passwords: ChangePasswordRequest): Promise<boolean> => {
    try {
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/admin/auth/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwords),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'パスワード変更に失敗しました');
      }

      return true;
    } catch (error) {
      console.error('パスワード変更エラー:', error);
      return false;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/admin/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 認証エラーの場合はログアウト
          await logout();
          return;
        }
        throw new Error('プロフィール取得に失敗しました');
      }

      const profile: AdminProfile = await response.json();
      setAdmin(profile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      // エラーの場合はログアウト
      await logout();
    }
  };

  const value: AuthContextType = {
    admin,
    token,
    isLoading,
    login,
    logout,
    changePassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
