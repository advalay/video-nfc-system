'use client';

import { useState, useEffect } from 'react';
import { Shop } from '../types/shared';
import { useSystemStats } from './useSystemStats';
import { useOrganizationStats } from './useOrganizationStats';
import { useMyShopStats } from './useMyShopStats';
import { useAuth } from './useAuth';

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
  shops: Array<{
    shopId: string;
    shopName: string;
    organizationName?: string;
    totalVideos: number;
    totalSize: number;
    monthlyVideos: number;
    weeklyVideos: number;
  }>;
}

interface UseShopStatsResult {
  stats: ShopStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useShopStats(shopId?: string): UseShopStatsResult {
  // 認証されたユーザー情報を取得
  const { user } = useAuth();
  
  // 権限チェック
  const isSystemAdmin = user?.groups?.includes('system-admin');
  const isOrganizationAdmin = user?.groups?.includes('organization-admin');
  const isShopAdmin = user?.groups?.includes('shop-admin');
  
  // 権限に応じて適切なAPIを呼び出し
  const shouldUseSystemStats = isSystemAdmin;
  const shouldUseOrganizationStats = isOrganizationAdmin;
  const shouldUseMyShopStats = isShopAdmin;
  
  // 常にすべてのフックを呼び出す（React Hooksのルールに従う）
  const { data: systemStats, isLoading: systemLoading, error: systemError, refetch: systemRefetch } = useSystemStats();
  const { data: organizationStats, isLoading: orgLoading, error: orgError, refetch: orgRefetch } = useOrganizationStats();
  const { data: myShopStats, isLoading: myShopLoading, error: myShopError, refetch: myShopRefetch } = useMyShopStats();
  
  // ローディング状態とエラーを統合
  const isLoading = shouldUseSystemStats ? systemLoading : 
                    (shouldUseOrganizationStats ? orgLoading : 
                    (shouldUseMyShopStats ? myShopLoading : false));
  const error = shouldUseSystemStats ? systemError : 
                (shouldUseOrganizationStats ? orgError : 
                (shouldUseMyShopStats ? myShopError : null));
  const refetch = async () => {
    if (shouldUseSystemStats) {
      await systemRefetch();
    } else if (shouldUseOrganizationStats) {
      await orgRefetch();
    } else if (shouldUseMyShopStats) {
      await myShopRefetch();
    }
  };

  // 権限に応じてデータをフィルタリング
  const stats: ShopStats | null = (() => {
    if (shouldUseSystemStats && systemStats) {
      // システム管理者: 全組織の全販売店を集計
      const allShops = systemStats.organizationStats?.flatMap(org => 
        org.shops.map(shop => ({
          shopId: shop.shopId,
          shopName: shop.shopName,
          organizationName: org.organizationName,
          contactPerson: shop.contactPerson,
          contactEmail: shop.contactEmail,
          contactPhone: shop.contactPhone,
          totalVideos: shop.totalVideos || 0,
          totalSize: shop.totalSize || 0,
          monthlyVideos: shop.monthlyVideos || 0,
          weeklyVideos: shop.weeklyVideos || 0
        }))
      ) || [];

      return {
        totalVideos: systemStats.totalVideos || 0,
        totalSize: systemStats.totalSize || 0,
        monthlyVideos: systemStats.totalMonthlyVideos || 0,
        weeklyVideos: systemStats.totalWeeklyVideos || 0,
        monthlyTrend: systemStats.monthlyTrend || [],
        shops: allShops
      };
    } else if (shouldUseMyShopStats && myShopStats) {
      // 販売店管理者: 自店舗のみの統計を表示（新しい専用API使用）
      return {
        totalVideos: myShopStats.totalVideos || 0,
        totalSize: myShopStats.totalSize || 0,
        monthlyVideos: myShopStats.monthlyVideos || 0,
        weeklyVideos: myShopStats.weeklyVideos || 0,
        monthlyTrend: myShopStats.monthlyTrend || [],
        shops: [{
          shopId: myShopStats.shopId,
          shopName: user?.shopName || '自店舗',
          organizationName: user?.organizationName || '自社',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          totalVideos: myShopStats.totalVideos || 0,
          totalSize: myShopStats.totalSize || 0,
          monthlyVideos: myShopStats.monthlyVideos || 0,
          weeklyVideos: myShopStats.weeklyVideos || 0
        }]
      };
    } else if (shouldUseOrganizationStats && organizationStats) {
      // 組織管理者: 自組織の販売店のみを抽出
      return {
        totalVideos: organizationStats.totalVideos || 0,
        totalSize: organizationStats.totalSize || 0,
        monthlyVideos: organizationStats.monthlyVideos || 0,
        weeklyVideos: organizationStats.weeklyVideos || 0,
        monthlyTrend: organizationStats.monthlyTrend || [],
        shops: organizationStats.shopStats?.map(shop => ({
          shopId: shop.shopId,
          shopName: shop.shopName,
          organizationName: user?.organizationName || '自社',
          contactPerson: (shop as any).contactPerson || '',
          contactEmail: (shop as any).contactEmail || '',
          contactPhone: (shop as any).contactPhone || '',
          totalVideos: shop.videoCount || 0,
          totalSize: shop.totalSize || 0,
          monthlyVideos: shop.monthlyCount || 0,
          weeklyVideos: shop.weeklyCount || 0
        })) || []
      };
    }
    
    return null;
  })();

  // データが取得できない場合は空データを返す
  const fallbackStats: ShopStats = {
    totalVideos: 0,
    totalSize: 0,
    monthlyVideos: 0,
    weeklyVideos: 0,
    monthlyTrend: [],
    shops: []
  };

  return {
    stats: stats || fallbackStats,
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
}