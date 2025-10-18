'use client';

import { useState, useEffect } from 'react';
import { Shop } from '../types/shared';
import { useSystemStats } from './useSystemStats';
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
  // システム統計を取得
  const { data: systemStats, isLoading, error, refetch } = useSystemStats();
  
  // 認証されたユーザー情報を取得
  const { user } = useAuth();

  // 権限に応じてデータをフィルタリング
  const stats: ShopStats | null = systemStats ? (() => {
    const isSystemAdmin = user?.groups?.includes('system-admin');
    console.log('useShopStats Debug:', {
      user: user?.id,
      organizationId: user?.organizationId,
      groups: user?.groups,
      isSystemAdmin,
      systemStats: systemStats ? {
        totalOrganizations: systemStats.totalOrganizations,
        organizationStats: systemStats.organizationStats?.map(org => ({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          shopsCount: org.shops?.length || 0
        }))
      } : null
    });

    if (isSystemAdmin) {
      // システム管理者: 全組織の全販売店を集計
      const allShops = systemStats.organizationStats?.flatMap(org => 
        org.shops.map(shop => ({
          shopId: shop.shopId,
          shopName: shop.shopName,
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
    } else {
      // パートナー企業: 自組織の販売店のみを抽出
      const targetOrgId = user?.organizationId;
      console.log('Target organization ID:', targetOrgId);
      
      const myOrg = systemStats.organizationStats?.find(
        org => org.organizationId === targetOrgId
      );

      if (!myOrg) {
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
        totalVideos: myOrg.totalVideos || 0,
        totalSize: myOrg.totalSize || 0,
        monthlyVideos: myOrg.monthlyVideos || 0,
        weeklyVideos: myOrg.weeklyVideos || 0,
        monthlyTrend: systemStats.monthlyTrend || [],
        shops: myOrg.shops.map(shop => ({
          shopId: shop.shopId,
          shopName: shop.shopName,
          totalVideos: shop.totalVideos || 0,
          totalSize: shop.totalSize || 0,
          monthlyVideos: shop.monthlyVideos || 0,
          weeklyVideos: shop.weeklyVideos || 0
        }))
      };
    }
  })() : null;

  return {
    stats,
    isLoading,
    error: error ? String(error) : null,
    refetch: async () => {
      await refetch();
    }
  };
}