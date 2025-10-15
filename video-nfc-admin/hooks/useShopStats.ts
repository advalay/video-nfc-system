import { useState, useEffect } from 'react';

interface ShopStat {
  shopId: string;
  shopName: string;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  lastUploadDate?: string;
}

interface UseShopStatsResult {
  stats: ShopStat | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShopStats(shopId?: string): UseShopStatsResult {
  const [stats, setStats] = useState<ShopStat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!shopId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // モックデータ
      const mockStats: ShopStat = {
        shopId,
        shopName: `販売店${shopId}`,
        totalVideos: Math.floor(Math.random() * 50) + 10,
        totalSize: Math.floor(Math.random() * 1000000000) + 100000000,
        monthlyVideos: Math.floor(Math.random() * 10) + 1,
        weeklyVideos: Math.floor(Math.random() * 5),
        lastUploadDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [shopId]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}