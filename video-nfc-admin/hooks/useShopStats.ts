'use client';

import { useState, useEffect } from 'react';
import { Shop } from '../types/shared';

interface ShopStats {
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  monthlyTrend: Array<{
    month: string;
    count: number;
    size: number;
  }>;
  recentVideos: Array<{
    videoId: string;
    title: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
  }>;
}

interface UseShopStatsResult {
  stats: ShopStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShopStats(shopId?: string): UseShopStatsResult {
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // モックデータを返す
      const mockStats: ShopStats = {
        totalVideos: 15,
        totalSize: 1024000000, // 1GB
        monthlyVideos: 3,
        weeklyVideos: 1,
        monthlyTrend: [
          { month: '2024-01', count: 5, size: 300 * 1024 * 1024 },
          { month: '2024-02', count: 3, size: 200 * 1024 * 1024 },
          { month: '2024-03', count: 4, size: 250 * 1024 * 1024 },
          { month: '2024-04', count: 3, size: 180 * 1024 * 1024 }
        ],
        recentVideos: [
          {
            videoId: 'video-001',
            title: 'サンプル動画1',
            fileName: 'sample1.mp4',
            fileSize: 100 * 1024 * 1024,
            uploadDate: '2024-04-15T10:00:00Z'
          },
          {
            videoId: 'video-002',
            title: 'サンプル動画2',
            fileName: 'sample2.mp4',
            fileSize: 150 * 1024 * 1024,
            uploadDate: '2024-04-14T14:30:00Z'
          }
        ]
      };

      setStats(mockStats);
    } catch (err) {
      setError('統計データの取得に失敗しました');
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
    refetch: fetchStats
  };
}