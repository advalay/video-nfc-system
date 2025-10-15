// 共通型定義ファイル - システム統計のデータ構造を基準とする

// 販売店情報
export interface Shop {
  shopId: string;
  shopName: string;
  organizationId: string;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt?: string;
}

// 組織（パートナー企業）情報
export interface Organization {
  organizationId: string;
  organizationName: string;
  shopCount: number;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt?: string;
  shops: Shop[];
}

// ユーザー情報
export interface User {
  userId: string;
  email: string;
  role: 'system-admin' | 'organization-admin' | 'shop-user';
  organizationId: string;
  organizationName: string;
  shopId?: string;
  shopName?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  updatedAt?: string;
}

// バックエンドからの組織統計（shopStatsを含む）
export interface OrganizationStat {
  organizationId: string;
  organizationName: string;
  totalShops: number;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  shopStats: Array<{
    shopId: string;
    shopName: string;
    videoCount: number;
    totalSize: number;
    monthlyCount: number;
    weeklyCount: number;
  }>;
}

// システム統計情報
export interface SystemStats {
  totalOrganizations: number;
  totalShops: number;
  totalVideos: number;
  totalSize: number;
  totalMonthlyVideos: number;
  totalWeeklyVideos: number;
  organizationStats: Organization[];
  monthlyTrend: Array<{
    month: string;
    count: number;
    size: number;
  }>;
}

// API レスポンス形式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// ページネーション情報
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// 一覧取得レスポンス
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}


