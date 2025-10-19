import { fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from './amplify-config';

const API_BASE_URL = 'https://rwwiyktk7e.execute-api.ap-northeast-1.amazonaws.com/dev';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 認証トークンを取得
 */
async function getAuthToken(): Promise<string | null> {
  try {
    configureAmplify();
    
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * API呼び出しの共通関数
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 常に開発モードヘッダーを追加（テスト用）
  (headers as any)['x-development-mode'] = 'true';
  console.log('Development mode: Adding x-development-mode header');

  // 認証トークンがあれば追加
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Making API request to:', url);
      console.log('Headers:', headers);
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // レスポンスをJSONとしてパース
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || `HTTP error! status: ${response.status}`,
        response.status,
        data.error?.code
      );
    }

    // success フィールドで判定（バックエンドのレスポンス形式）
    if (data.success === false) {
      throw new ApiError(
        data.error?.message || 'API request failed',
        response.status,
        data.error?.code
      );
    }

    // data フィールドがあればそれを返す、なければ全体を返す
    return data.data || data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // ネットワークエラーやパースエラー
    if (error instanceof Error) {
      // ユーザーに分かりやすいメッセージ
      throw new ApiError('ネットワークに接続できません。時間をおいて再試行してください。', 0);
    }

    throw new ApiError('Unknown error occurred', 0);
  }
}

/**
 * GET リクエスト
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

/**
 * POST リクエスト
 */
export async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT リクエスト
 */
export async function apiPut<T>(endpoint: string, body?: any): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH リクエスト
 */
export async function apiPatch<T>(endpoint: string, body?: any): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE リクエスト
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
}

// ========================================
// 組織・販売店管理用API関数
// ========================================

/**
 * 組織情報を更新
 */
export async function updateOrganization(
  organizationId: string, 
  data: { organizationName?: string; contactPerson?: string; contactEmail?: string; contactphone?: string; billingAddress?: string; status?: string }
): Promise<any> {
  return apiPut<any>(`/organizations/${organizationId}`, data);
}


/**
 * 販売店情報を更新
 */
export async function updateShop(
  shopId: string, 
  data: { shopName?: string; contactEmail?: string; contactPhone?: string; status?: string }
): Promise<any> {
  return apiPatch<any>(`/shops/${shopId}`, data);
}

/**
 * 販売店を削除
 */
export async function deleteShop(shopId: string): Promise<any> {
  return apiDelete<any>(`/shops/${shopId}`);
}

/**
 * システム統計を取得
 */
export async function getSystemStats(): Promise<any> {
  return apiGet<any>('/system-stats');
}

/**
 * 組織を作成
 */
export async function createOrganization(data: {
  organizationName: string;
  organizationType: 'agency' | 'store';
  email: string;
  contactPerson: string;
  contactphone?: string;
  contactEmail?: string;
  billingAddress?: string;
}): Promise<{
  organizationId: string;
  organizationName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}> {
  return apiPost<any>('/organizations', data);
}

/**
 * 販売店を作成
 */
export async function createShop(data: {
  shopName: string;
  organizationId: string;
  email: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
}): Promise<{
  shopId: string;
  shopName: string;
  email: string;
  tempPassword?: string;
  loginUrl: string;
  isExistingUser?: boolean;
}> {
  return apiPost<any>('/shops', data);
}

// Force rebuild Sat Oct 18 00:17:19 JST 2025
