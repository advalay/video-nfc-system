'use client';

import { useQuery } from '@tanstack/react-query';
import { SystemStats, OrganizationStat, Organization, Shop } from '../types/shared';
import { apiGet } from '../lib/api-client';
import { useAuth } from './useAuth';

export type { OrganizationStat };

// バックエンドのレスポンスをフロントエンドの型に変換
function transformBackendResponse(backendData: any): SystemStats {
  console.log('Backend data received:', JSON.stringify(backendData, null, 2));
  
  const result = {
    totalOrganizations: backendData.totalOrganizations || 0,
    totalShops: backendData.totalShops || 0,
    totalVideos: backendData.totalVideos || 0,
    totalSize: backendData.totalSize || 0,
    totalMonthlyVideos: backendData.totalMonthlyVideos || 0,
    totalWeeklyVideos: backendData.totalWeeklyVideos || 0,
    monthlyTrend: backendData.monthlyTrend || [],
    organizationStats: (backendData.organizationStats || []).map((orgStat: OrganizationStat): Organization => {
      console.log('Processing organization:', orgStat.organizationId, 'shopStats:', orgStat.shopStats);
      
      return {
        organizationId: orgStat.organizationId,
        organizationName: orgStat.organizationName,
        shopCount: orgStat.shopStats?.length || 0,
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
          contactEmail: shopStat.contactEmail || '',
          contactPhone: shopStat.contactPhone || '',
          totalVideos: shopStat.videoCount || 0,
          totalSize: shopStat.totalSize || 0,
          monthlyVideos: shopStat.monthlyCount || 0,
          weeklyVideos: shopStat.weeklyCount || 0,
          status: 'active',
          createdAt: new Date().toISOString()
        }))
      };
    })
  };
  
  console.log('Transformed result:', JSON.stringify(result, null, 2));
  return result;
}

export function useSystemStats(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const isSystemAdmin = user?.groups?.includes('system-admin');

  return useQuery<SystemStats>({
    queryKey: ['systemStats', startDate, endDate],
    queryFn: async () => {
      if (!isSystemAdmin) {
        throw new Error('システム管理者のみアクセス可能です');
      }
      
      // API呼び出し
      let endpoint = '/system/stats';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      const backendData = await apiGet<any>(endpoint);
      return transformBackendResponse(backendData);
    },
    enabled: isSystemAdmin, // システム管理者の場合のみクエリを有効化
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ（長くする）
    retry: 0, // リトライを無効化
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false, // マウント時の再取得を無効化
  });
}