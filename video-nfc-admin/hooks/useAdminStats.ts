import { useQuery } from '@tanstack/react-query';
import { AdminStats, ApiResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UseAdminStatsOptions {
  startDate?: Date | null;
  endDate?: Date | null;
}

export function useAdminStats(options?: UseAdminStatsOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminStats', options?.startDate, options?.endDate],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      
      // 日付範囲パラメータを追加
      const params = new URLSearchParams();
      if (options?.startDate) {
        params.append('startDate', options.startDate.toISOString().split('T')[0]);
      }
      if (options?.endDate) {
        params.append('endDate', options.endDate.toISOString().split('T')[0]);
      }
      
      const url = `${API_URL}/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('統計データの取得に失敗しました');
      }

      const result: ApiResponse<AdminStats> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '統計データの取得に失敗しました');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
  });

  return {
    stats: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

