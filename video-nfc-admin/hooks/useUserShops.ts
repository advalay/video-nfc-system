import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface UserShop {
  shopId: string;
  shopName: string;
  organizationId: string;
  organizationName: string;
  role: string;
  createdAt: string;
}

interface UseUserShopsResult {
  shops: UserShop[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserShops(): UseUserShopsResult {
  const [shops, setShops] = useState<UserShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!API_URL) {
        throw new Error('API URLが設定されていません');
      }

      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('認証トークンが取得できません');
      }

      const response = await fetch(`${API_URL}/user/shops`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`販売店一覧の取得に失敗しました: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '販売店一覧の取得に失敗しました');
      }

      setShops(data.data.shops || []);
    } catch (err: any) {
      console.error('販売店一覧取得エラー:', err);
      setError(err.message || '販売店一覧の取得に失敗しました');
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  return {
    shops,
    isLoading,
    error,
    refetch: fetchShops,
  };
}
