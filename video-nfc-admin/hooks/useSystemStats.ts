'use client';

import { useQuery } from '@tanstack/react-query';
import { SystemStats, OrganizationStat, Organization, Shop } from '../types/shared';
import { apiGet } from '../lib/api-client';
import { useAuth } from './useAuth';

export type { OrganizationStat };

// バックエンドのレスポンスをフロントエンドの型に変換
function transformBackendResponse(backendData: any): SystemStats {
  const result = {
    totalOrganizations: backendData.totalOrganizations || 0,
    totalShops: backendData.totalShops || 0,
    totalVideos: backendData.totalVideos || 0,
    totalSize: backendData.totalSize || 0,
    totalMonthlyVideos: backendData.totalMonthlyVideos || 0,
    totalWeeklyVideos: backendData.totalWeeklyVideos || 0,
    monthlyTrend: backendData.monthlyTrend || [],
    organizationStats: (backendData.organizationStats || []).map((orgStat: OrganizationStat): Organization => {
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
  
  return result;
}

export function useSystemStats(startDate?: string, endDate?: string) {
  const { user, isLoading } = useAuth();
  
  // より安全な権限判定
  const isSystemAdmin = user?.groups && Array.isArray(user.groups) && user.groups.includes('system-admin');

  return useQuery<SystemStats>({
    queryKey: ['systemStats', startDate, endDate],
    queryFn: async () => {
      // より詳細なエラーメッセージ
      if (!user) {
        console.error('❌ [useSystemStats] ユーザー情報が取得できません');
        throw new Error('認証情報が取得できません。ログインし直してください。');
      }
      
      if (!user.groups || !Array.isArray(user.groups)) {
        console.error('❌ [useSystemStats] グループ情報が取得できません:', user.groups);
        throw new Error('グループ情報が取得できません。ログインし直してください。');
      }
      
      if (!isSystemAdmin) {
        console.error('❌ [useSystemStats] 権限エラー:', {
          user: user,
          groups: user?.groups,
          isSystemAdmin: isSystemAdmin,
          expectedGroup: 'system-admin'
        });
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
    enabled: !isLoading && isSystemAdmin, // 認証完了後かつシステム管理者の場合のみクエリを有効化
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1, // 1回リトライ
  });
}