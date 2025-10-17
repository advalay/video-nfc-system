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
      // 開発環境でも実際のAPIを呼び出す
      console.log('Fetching system stats from API...');
      console.log('Environment:', process.env.NODE_ENV);
      
      let endpoint = '/system/stats';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      console.log('API endpoint:', endpoint);
      
      try {
        const backendData = await apiGet<any>(endpoint);
        console.log('API response:', backendData);
        return transformBackendResponse(backendData);
      } catch (error) {
        console.error('API call failed, falling back to mock data:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // API呼び出しが失敗した場合はモックデータを使用
        return getMockSystemStats();
      }
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ（長くする）
    retry: 0, // リトライを無効化
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false, // マウント時の再取得を無効化
  });
}

// モックデータを生成する関数
function getMockSystemStats(): SystemStats {
  return {
    totalOrganizations: 3,
    totalShops: 8,
    totalVideos: 156,
    totalSize: 2.4 * 1024 * 1024 * 1024, // 2.4GB
    totalMonthlyVideos: 23,
    totalWeeklyVideos: 7,
    organizationStats: [
      {
        organizationId: 'org-001',
        organizationName: '株式会社サンプル企業A',
        shopCount: 3,
        totalVideos: 67,
        totalSize: 1.2 * 1024 * 1024 * 1024, // 1.2GB
        monthlyVideos: 12,
        weeklyVideos: 4,
        status: 'active',
        createdAt: '2024-01-15T09:00:00Z',
        shops: [
          {
            shopId: 'shop-001',
            shopName: 'サンプル店舗A-1',
            organizationId: 'org-001',
            totalVideos: 25,
            totalSize: 500 * 1024 * 1024, // 500MB
            monthlyVideos: 5,
            weeklyVideos: 2,
            status: 'active',
            createdAt: '2024-01-15T09:00:00Z'
          },
          {
            shopId: 'shop-002',
            shopName: 'サンプル店舗A-2',
            organizationId: 'org-001',
            totalVideos: 22,
            totalSize: 400 * 1024 * 1024, // 400MB
            monthlyVideos: 4,
            weeklyVideos: 1,
            status: 'active',
            createdAt: '2024-01-15T09:00:00Z'
          },
          {
            shopId: 'shop-003',
            shopName: 'サンプル店舗A-3',
            organizationId: 'org-001',
            totalVideos: 20,
            totalSize: 300 * 1024 * 1024, // 300MB
            monthlyVideos: 3,
            weeklyVideos: 1,
            status: 'active',
            createdAt: '2024-01-15T09:00:00Z'
          }
        ]
      },
      {
        organizationId: 'org-002',
        organizationName: '株式会社サンプル企業B',
        shopCount: 3,
        totalVideos: 52,
        totalSize: 800 * 1024 * 1024, // 800MB
        monthlyVideos: 8,
        weeklyVideos: 2,
        status: 'active',
        createdAt: '2024-02-01T10:00:00Z',
        shops: [
          {
            shopId: 'shop-004',
            shopName: 'サンプル店舗B-1',
            organizationId: 'org-002',
            totalVideos: 18,
            totalSize: 300 * 1024 * 1024, // 300MB
            monthlyVideos: 3,
            weeklyVideos: 1,
            status: 'active',
            createdAt: '2024-02-01T10:00:00Z'
          },
          {
            shopId: 'shop-005',
            shopName: 'サンプル店舗B-2',
            organizationId: 'org-002',
            totalVideos: 17,
            totalSize: 250 * 1024 * 1024, // 250MB
            monthlyVideos: 3,
            weeklyVideos: 1,
            status: 'active',
            createdAt: '2024-02-01T10:00:00Z'
          },
          {
            shopId: 'shop-006',
            shopName: 'サンプル店舗B-3',
            organizationId: 'org-002',
            totalVideos: 17,
            totalSize: 250 * 1024 * 1024, // 250MB
            monthlyVideos: 2,
            weeklyVideos: 0,
            status: 'active',
            createdAt: '2024-02-01T10:00:00Z'
          }
        ]
      },
      {
        organizationId: 'org-003',
        organizationName: '株式会社サンプル企業C',
        shopCount: 2,
        totalVideos: 37,
        totalSize: 400 * 1024 * 1024, // 400MB
        monthlyVideos: 3,
        weeklyVideos: 1,
        status: 'active',
        createdAt: '2024-03-01T11:00:00Z',
        shops: [
          {
            shopId: 'shop-007',
            shopName: 'サンプル店舗C-1',
            organizationId: 'org-003',
            totalVideos: 20,
            totalSize: 250 * 1024 * 1024, // 250MB
            monthlyVideos: 2,
            weeklyVideos: 1,
            status: 'active',
            createdAt: '2024-03-01T11:00:00Z'
          },
          {
            shopId: 'shop-008',
            shopName: 'サンプル店舗C-2',
            organizationId: 'org-003',
            totalVideos: 17,
            totalSize: 150 * 1024 * 1024, // 150MB
            monthlyVideos: 1,
            weeklyVideos: 0,
            status: 'active',
            createdAt: '2024-03-01T11:00:00Z'
          }
        ]
      }
    ],
    monthlyTrend: [
      { month: '2024-01', count: 45, size: 800 * 1024 * 1024 },
      { month: '2024-02', count: 38, size: 600 * 1024 * 1024 },
      { month: '2024-03', count: 42, size: 700 * 1024 * 1024 },
      { month: '2024-04', count: 31, size: 500 * 1024 * 1024 }
    ]
  };
}