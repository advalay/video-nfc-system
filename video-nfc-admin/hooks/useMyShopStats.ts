'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';
import { useAuth } from './useAuth';

export interface MyShopStats {
  shopId: string;
  organizationId: string;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  monthlyTrend: Array<{
    month: string;
    count: number;
    size: number;
  }>;
}

export function useMyShopStats(startDate?: string, endDate?: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { user } = useAuth();

  // shop-adminのみ有効化
  const isShopAdmin = user?.groups?.includes('shop-admin');

  return useQuery<MyShopStats>({
    queryKey: ['myShopStats', startDate, endDate],
    enabled: isShopAdmin, // shop-adminのみ実行
    queryFn: async () => {
      configureAmplify();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('認証トークンが取得できません');
      }

      // クエリパラメータを構築
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${API_URL}/shop/stats${params.toString() ? `?${params.toString()}` : ''}`;

      console.log('Fetching shop stats from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shop stats API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('Shop stats response:', result);

      if (!result.success) {
        throw new Error(result.error?.message || '統計データの取得に失敗しました');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 3,
  });
}

