'use client';

import { useState, useEffect } from 'react';
import { Shop } from '../types/shared';
import { useSystemStats } from './useSystemStats';
import { useOrganizationStats } from './useOrganizationStats';
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
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
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
  const shouldUseOrganizationStats = isOrganizationAdmin || isShopAdmin;
  
  // 常に両方のフックを呼び出す（React Hooksのルールに従う）
  const { data: systemStats, isLoading: systemLoading, error: systemError, refetch: systemRefetch } = useSystemStats();
  const { data: organizationStats, isLoading: orgLoading, error: orgError, refetch: orgRefetch } = useOrganizationStats();
  
  // ローディング状態とエラーを統合
  const isLoading = shouldUseSystemStats ? systemLoading : (shouldUseOrganizationStats ? orgLoading : false);
  const error = shouldUseSystemStats ? systemError : (shouldUseOrganizationStats ? orgError : null);
  const refetch = async () => {
    if (shouldUseSystemStats) {
      await systemRefetch();
    } else if (shouldUseOrganizationStats) {
      await orgRefetch();
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
    } else if (shouldUseOrganizationStats && organizationStats) {
      // 組織管理者または販売店管理者: 組織統計を使用
      if (isShopAdmin && user?.shopId) {
        // 販売店管理者: 自店舗のみの統計を表示
        const myShop = organizationStats.shopStats?.find(
          shop => shop.shopId === user.shopId
        );
        
        if (!myShop) {
          return {
            totalVideos: 0,
            totalSize: 0,
            monthlyVideos: 0,
            weeklyVideos: 0,
            monthlyTrend: [],
            shops: []
          };
        }
        
        return {
          totalVideos: myShop.videoCount || 0,
          totalSize: myShop.totalSize || 0,
          monthlyVideos: myShop.monthlyCount || 0,
          weeklyVideos: myShop.weeklyCount || 0,
          monthlyTrend: organizationStats.monthlyTrend || [],
          shops: [{
            shopId: myShop.shopId,
            shopName: myShop.shopName,
            organizationName: user?.organizationName || '自社',
            contactPerson: myShop.contactPerson,
            contactEmail: myShop.contactEmail,
            contactPhone: myShop.contactPhone,
            totalVideos: myShop.videoCount || 0,
            totalSize: myShop.totalSize || 0,
            monthlyVideos: myShop.monthlyCount || 0,
            weeklyVideos: myShop.weeklyCount || 0
          }]
        };
      } else {
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
            contactPerson: shop.contactPerson,
            contactEmail: shop.contactEmail,
            contactPhone: shop.contactPhone,
            totalVideos: shop.videoCount || 0,
            totalSize: shop.totalSize || 0,
            monthlyVideos: shop.monthlyCount || 0,
            weeklyVideos: shop.weeklyCount || 0
          })) || []
        };
      }
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