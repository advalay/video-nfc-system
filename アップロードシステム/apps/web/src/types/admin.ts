export interface Store {
  id: string;
  companyName: string;
  storeName: string;
  contactName: string;
  contactEmail: string;
  notifyEmail?: string;
  youtubeChannelName?: string;
  storeToken: string;
  hashedStoreToken: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreStatistics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  storesCreatedThisMonth: number;
}

export interface CreateStoreRequest {
  companyName: string;
  storeName: string;
  contactName: string;
  contactEmail: string;
  youtubeChannelName?: string;
  formSubmissionId?: string;
}

export interface UpdateStoreRequest {
  storeName?: string;
  contactName?: string;
  contactEmail?: string;
  notifyEmail?: string;
  youtubeChannelName?: string;
  enabled?: boolean;
}

export interface RegenerateTokenRequest {
  yearMonth?: string;
}

export interface StoreListResponse {
  stores: Store[];
  total: number;
  page: number;
  totalPages: number;
}

// アップロード統計関連の型定義
export interface UploadStatsSummary {
  storeId: string;
  storeName: string;
  companyName: string;
  totalUploads: number;
  totalSuccess: number;
  totalFailed: number;
  totalSize: number;
  averageSize: number;
  successRate: number;
  lastUploadDate?: string;
  periodStats: {
    date: string;
    uploadCount: number;
    successCount: number;
    failedCount: number;
    totalSize: number;
  }[];
}

export interface OverallUploadStats {
  totalStores: number;
  totalUploads: number;
  totalSuccess: number;
  totalFailed: number;
  totalSize: number;
  averageSize: number;
  successRate: number;
  topStores: UploadStatsSummary[];
}

export interface DailyUploadStats {
  date: string;
  totalUploads: number;
  totalSuccess: number;
  totalFailed: number;
  totalSize: number;
  storeCount: number;
}

export interface UploadStatsFilter {
  startDate?: string;
  endDate?: string;
  storeIds?: string[];
  companyIds?: string[];
}

// 認証関連の型定義
export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: AdminProfile;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}

// Googleアカウント管理関連の型定義
export interface GoogleAccount {
  id: string;
  storeId: string;
  googleEmail: string;
  googleUserId: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  tokenExpiresAt: string;
  lastTokenRefresh?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeChannel {
  id: string;
  googleAccountId: string;
  channelId: string;
  channelTitle: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoogleAccountRequest {
  storeId: string;
  googleEmail: string;
}

export interface OAuthCallbackRequest {
  storeId: string;
  code: string;
  state: string;
}

export interface UpdateAccountStatusRequest {
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  errorMessage?: string;
}

export interface GoogleAccountListResponse {
  accounts: GoogleAccount[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuthUrlResponse {
  authUrl: string;
}

