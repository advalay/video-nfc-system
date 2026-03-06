import { fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from './amplify-config';
import { UpdateShopInput, OrganizationAdmin } from '../types/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL環境変数が設定されていません');
}

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
    const token = session.tokens?.idToken?.toString() || null;
    return token;
  } catch (error) {
    console.error('Failed to get auth token');
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

  // 認証トークンがあれば追加
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // レスポンスをJSONとしてパース
    const data = await response.json();

    if (!response.ok) {
      // 409エラーの場合は具体的なメッセージを優先
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (response.status === 409 && data.error) {
        errorMessage = data.error;
      } else if (data.error?.message) {
        errorMessage = data.error.message;
      }
      
      throw new ApiError(
        errorMessage,
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
      const errorMessage = error.message;
      
      // CORSエラーの場合
      if (errorMessage?.includes('CORS') || errorMessage?.includes('blocked by CORS policy')) {
        throw new ApiError('CORSエラーが発生しました。管理者にご連絡ください。', 0);
      }
      
      // 502 Bad Gatewayエラーの場合
      if (errorMessage?.includes('502') || errorMessage?.includes('Bad Gateway')) {
        throw new ApiError('サーバーエラーが発生しました。しばらく時間をおいて再試行してください。', 502);
      }
      
      // 認証エラーの場合
      if (errorMessage?.includes('401') || errorMessage?.includes('Unauthorized')) {
        throw new ApiError('認証に失敗しました。ログインし直してください。', 401);
      }
      
      // 権限エラーの場合
      if (errorMessage?.includes('403') || errorMessage?.includes('Forbidden')) {
        throw new ApiError('アクセス権限がありません。管理者にご連絡ください。', 403);
      }
      
      // その他のネットワークエラー
      throw new ApiError('通信エラーが発生しました。時間をおいて再試行してください。', 0);
    }

    throw new ApiError('予期しないエラーが発生しました。', 0);
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
  data: UpdateShopInput
): Promise<any> {
  return apiPatch<any>(`/shops/${shopId}`, data);
}

/**
 * 販売店のパスワードをリセット（パスワードリセットメール送信）
 */
export async function resetShopPassword(shopId: string): Promise<any> {
  return apiPost<any>(`/shops/${shopId}/reset-password`, {});
}

/**
 * 販売店を削除
 */
export async function deleteShop(shopId: string): Promise<any> {
  return apiDelete<any>(`/shops/${shopId}`);
}

/**
 * 組織管理者情報を取得
 */
export async function getOrganizationAdmin(organizationId: string): Promise<OrganizationAdmin> {
  const response = await apiGet<any>(`/organizations/${organizationId}/admin`);
  return response;
}

/**
 * 組織管理者のパスワードをリセット（パスワードリセットメール送信）
 */
export async function resetOrganizationPassword(organizationId: string): Promise<any> {
  return apiPost<any>(`/organizations/${organizationId}/reset-password`, {});
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
  loginUrl: string;
  message?: string;
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
  loginUrl: string;
  message?: string;
}> {
  return apiPost<any>('/shops', data);
}

