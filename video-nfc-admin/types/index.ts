// ========================================
// API Response Types
// ========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ========================================
// User & Auth Types
// ========================================
export interface User {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  shopId?: string;
  groups: string[];
}

export interface UserInfo {
  email: string;
  groups: string[];
  organizationId: string;
  shopId: string;
  role: string;
  organizationName?: string;
  shopName?: string;
  userId: string;
}

// ========================================
// Video Types
// ========================================
export interface Video {
  videoId: string;
  fileName: string;
  fileSize: number;
  s3Key: string;
  organizationId: string;
  organizationName?: string;
  shopId: string;
  shopName?: string;
  uploader: string;
  uploadDate: string;
  status: 'active' | 'deleted';
  publicUrl: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoDetail extends Video {
  branding?: BrandingConfig;
}

export interface BrandingConfig {
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// ========================================
// Organization Types
// ========================================
export interface Organization {
  organizationId: string;
  organizationType: 'agency' | 'store';
  organizationName: string;
  parentId: string | null;
  level: number;
  contactphone: string;
  status: 'active' | 'suspended';
  unitPrice: number;
  totalVideos: number;
  totalStorage: number;
  contractDate: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// Admin Stats Types
// ========================================
export interface AdminStats {
  totalVideos: number;
  totalStorage: number;
  agencyCount: number;
  storeCount: number;
  thisMonthUploads: number;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  month: string;        // "2025-01"
  count: number;
  size: number;
}

// ========================================
// Filter Types
// ========================================
export interface VideoFilters {
  organizationId?: string;
  status?: 'active' | 'deleted';
  search?: string;
}

export interface OrganizationFilters {
  type?: 'agency' | 'store';
  parentId?: string;
}

// ========================================
// Organization Input Types
// ========================================
export interface CreateOrganizationInput {
  organizationType: 'agency' | 'store';
  organizationName: string;
  parentId?: string;
  contactphone?: string;
  unitPrice?: number;
}

export interface UpdateOrganizationInput {
  organizationName?: string;
  contactphone?: string;
  status?: 'active' | 'suspended';
  unitPrice?: number;
}

// ========================================
// Upload Types
// ========================================
export interface UploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  s3Key: string;
}

export interface UploadProgress {
  videoId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

