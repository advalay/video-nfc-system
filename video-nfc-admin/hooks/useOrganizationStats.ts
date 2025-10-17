'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';

export interface OrganizationStats {
  organizationName: string;
  organizationId: string;
  totalShops: number;
  totalVideos: number;
  totalSize: number;
  totalMonthlyVideos: number;
  totalWeeklyVideos: number;
  shopStats: Array<{
    shopId: string;
    shopName: string;
    videoCount: number;
    totalSize: number;
    monthlyCount: number;
    weeklyCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    size: number;
  }>;
}

export function useOrganizationStats(startDate?: string, endDate?: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  return useQuery<OrganizationStats>({
    queryKey: ['organizationStats', startDate, endDate],
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

      const url = `${API_URL}/organization/stats${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || '統計データの取得に失敗しました');
      }

      return result.data;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 3,
  });
}




