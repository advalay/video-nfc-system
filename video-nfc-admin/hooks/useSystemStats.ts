'use client';

import { useQuery } from '@tanstack/react-query';
import { SystemStats, OrganizationStat, Organization, Shop } from '../types/shared';
import { apiGet } from '../lib/api-client';

export type { OrganizationStat };

// バックエンドのレスポンスをフロントエンドの型に変換
function transformBackendResponse(backendData: any): SystemStats {
  return {
    totalOrganizations: backendData.totalOrganizations || 0,
    totalShops: backendData.totalShops || 0,
    totalVideos: backendData.totalVideos || 0,
    totalSize: backendData.totalSize || 0,
    totalMonthlyVideos: backendData.totalMonthlyVideos || 0,
    totalWeeklyVideos: backendData.totalWeeklyVideos || 0,
    monthlyTrend: backendData.monthlyTrend || [],
    organizationStats: (backendData.organizationStats || []).map((orgStat: OrganizationStat): Organization => ({
      organizationId: orgStat.organizationId,
      organizationName: orgStat.organizationName,
      shopCount: orgStat.totalShops || 0,
      totalVideos: orgStat.totalVideos || 0,
      totalSize: orgStat.totalSize || 0,
      monthlyVideos: orgStat.monthlyVideos || 0,
      weeklyVideos: orgStat.weeklyVideos || 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      shops: (orgStat.shopStats || []).map((shopStat): Shop => ({
        shopId: shopStat.shopId,
        shopName: shopStat.shopName,
        organizationId: orgStat.organizationId,
        totalVideos: shopStat.videoCount || 0,
        totalSize: shopStat.totalSize || 0,
        monthlyVideos: shopStat.monthlyCount || 0,
        weeklyVideos: shopStat.weeklyCount || 0,
        status: 'active',
        createdAt: new Date().toISOString()
      }))
    }))
  };
}

export function useSystemStats(startDate?: string, endDate?: string) {
  return useQuery<SystemStats>({
    queryKey: ['systemStats', startDate, endDate],
    queryFn: async () => {
      // API呼び出し
      let endpoint = '/system/stats';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      const backendData = await apiGet<any>(endpoint);
      return transformBackendResponse(backendData);
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ（長くする）
    retry: 0, // リトライを無効化
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false, // マウント時の再取得を無効化
  });
}