import { useState, useEffect } from 'react';

interface UserInfo {
  email: string;
  groups: string[];
  organizationId: string;
  shopId: string;
  role: string;
  organizationName?: string;
  shopName?: string;
  userId: string;
}

interface UseAuthResult {
  userInfo: UserInfo | null;
  isLoadingAuth: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setIsLoadingAuth(true);
        setError(null);

        // モックのユーザー情報
        const mockUserInfo: UserInfo = {
          email: 'system-admin@example.com',
          groups: ['system-admin'],
          organizationId: 'SYSTEM',
          shopId: '',
          role: 'system-admin',
          organizationName: 'SYSTEM',
          userId: 'system-admin-001'
        };

        setUserInfo(mockUserInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : '認証情報の取得に失敗しました');
      } finally {
        setIsLoadingAuth(false);
      }
    };

    loadUserInfo();
  }, []);

  const signOut = async () => {
    try {
      setUserInfo(null);
      // 実際のアプリでは、ここでAmplifyのsignOutを呼び出す
      console.log('Signing out...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました');
    }
  };

  return {
    userInfo,
    isLoadingAuth,
    error,
    signOut,
  };
}