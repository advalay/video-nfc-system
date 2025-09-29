'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  GoogleAccount, 
  GoogleAccountListResponse, 
  CreateGoogleAccountRequest,
  UpdateAccountStatusRequest,
  AuthUrlResponse 
} from '../types/admin';

interface GoogleAccountManagementProps {
  storeId?: string;
}

export default function GoogleAccountManagement({ storeId }: GoogleAccountManagementProps) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  useEffect(() => {
    loadGoogleAccounts();
  }, [currentPage, storeId]);

  const loadGoogleAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = storeId 
        ? `/api/admin/google-accounts/store/${storeId}`
        : `/api/admin/google-accounts?page=${currentPage}&limit=20`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Googleアカウント情報の取得に失敗しました');
      }

      const data = storeId ? await response.json() : await response.json() as GoogleAccountListResponse;
      
      if (storeId) {
        setAccounts([data as GoogleAccount]);
      } else {
        setAccounts(data.accounts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAuthUrl = async (storeId: string) => {
    try {
      const response = await fetch('/api/admin/google-accounts/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId }),
      });

      if (!response.ok) {
        throw new Error('認証URLの生成に失敗しました');
      }

      const data: AuthUrlResponse = await response.json();
      window.open(data.authUrl, '_blank');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refreshAccessToken = async (accountId: string) => {
    try {
      const response = await fetch(`/api/admin/google-accounts/${accountId}/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('トークンの更新に失敗しました');
      }

      await loadGoogleAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateAccountStatus = async (accountId: string, status: string, errorMessage?: string) => {
    try {
      const response = await fetch(`/api/admin/google-accounts/${accountId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status, errorMessage } as UpdateAccountStatusRequest),
      });

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }

      await loadGoogleAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteGoogleAccount = async (accountId: string) => {
    if (!confirm('このGoogleアカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/google-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Googleアカウントの削除に失敗しました');
      }

      await loadGoogleAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: '認証待ち', color: 'bg-yellow-100 text-yellow-800' },
      ACTIVE: { label: 'アクティブ', color: 'bg-green-100 text-green-800' },
      EXPIRED: { label: '期限切れ', color: 'bg-red-100 text-red-800' },
      REVOKED: { label: '取り消し', color: 'bg-gray-100 text-gray-800' },
      ERROR: { label: 'エラー', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ERROR;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {storeId ? 'Googleアカウント情報' : 'Googleアカウント管理'}
        </h2>
        {!storeId && (
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            新しいGoogleアカウントを追加
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Googleアカウントが登録されていません</p>
          {!storeId && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              最初のGoogleアカウントを追加
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    店舗ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Googleメール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    有効期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終更新
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.storeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.googleEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(account.status)}
                      {account.errorMessage && (
                        <div className="mt-1 text-xs text-red-600">
                          {account.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(account.tokenExpiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.lastTokenRefresh ? formatDate(account.lastTokenRefresh) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {account.status === 'EXPIRED' && (
                          <button
                            onClick={() => refreshAccessToken(account.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            トークン更新
                          </button>
                        )}
                        <button
                          onClick={() => deleteGoogleAccount(account.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {!storeId && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    ページ <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    ({total}件中)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">前へ</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">次へ</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 認証モーダル */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Googleアカウント認証
              </h3>
              <div className="mb-4">
                <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 mb-2">
                  店舗ID
                </label>
                <input
                  type="text"
                  id="storeId"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="店舗IDを入力してください"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (selectedStoreId) {
                      generateAuthUrl(selectedStoreId);
                      setShowAuthModal(false);
                    }
                  }}
                  disabled={!selectedStoreId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  認証開始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
