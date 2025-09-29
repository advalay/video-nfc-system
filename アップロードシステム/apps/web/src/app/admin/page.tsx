'use client';

import React, { useState, useEffect } from 'react';
import { Store, StoreStatistics, UploadStatsSummary, OverallUploadStats, DailyUploadStats, UploadStatsFilter } from '@/types/admin';
import AdminAuthGuard from '../../components/AdminAuthGuard';
import AdminProfile from '../../components/AdminProfile';
import GoogleAccountManagement from '../../components/GoogleAccountManagement';
import { useAuth } from '../../contexts/AuthContext';

function AdminDashboard() {
  const { admin, token } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [statistics, setStatistics] = useState<StoreStatistics | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStatsSummary[]>([]);
  const [overallStats, setOverallStats] = useState<OverallUploadStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyUploadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'stores' | 'upload-stats' | 'google-accounts' | 'profile'>('stores');
  
  // フィルター状態
  const [filter, setFilter] = useState<UploadStatsFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 過去30日
    endDate: new Date().toISOString().split('T')[0], // 今日
  });

  useEffect(() => {
    loadStores();
    loadStatistics();
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === 'upload-stats') {
      loadUploadStats();
    }
  }, [activeTab, filter]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stores?page=${currentPage}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('店舗一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      setStores(data.stores);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('統計情報の取得に失敗しました');
      }
      
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('統計情報の取得エラー:', err);
    }
  };

  const loadUploadStats = async () => {
    try {
      setLoading(true);
      
      // クエリパラメータを構築
      const params = new URLSearchParams();
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      if (filter.storeIds?.length) params.append('storeIds', filter.storeIds.join(','));
      if (filter.companyIds?.length) params.append('companyIds', filter.companyIds.join(','));

      const [storesResponse, overallResponse, dailyResponse] = await Promise.all([
        fetch(`/api/admin/upload-stats/stores?${params.toString()}`),
        fetch(`/api/admin/upload-stats/overall?${params.toString()}`),
        fetch(`/api/admin/upload-stats/daily?${params.toString()}`),
      ]);

      if (!storesResponse.ok || !overallResponse.ok || !dailyResponse.ok) {
        throw new Error('アップロード統計の取得に失敗しました');
      }

      const [storesData, overallData, dailyData] = await Promise.all([
        storesResponse.json(),
        overallResponse.json(),
        dailyResponse.json(),
      ]);

      setUploadStats(storesData);
      setOverallStats(overallData);
      setDailyStats(dailyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'X-Store-Token': 'admin-token',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('ステータスの切り替えに失敗しました');
      }
      
      await loadStores();
      await loadStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const regenerateToken = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/regenerate-token`, {
        method: 'POST',
        headers: {
          'X-Store-Token': 'admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('トークンの再生成に失敗しました');
      }
      
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">店舗管理ダッシュボード</h1>
          <p className="mt-2 text-gray-600">店舗情報の管理とアップロード統計の確認を行います</p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">エラー</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ヘッダー情報 */}
        <div className="mb-6 bg-blue-50 p-4 rounded-lg">
          <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
          <p className="text-sm text-gray-600">
            ログイン中: <span className="font-medium">{admin?.name}</span> ({admin?.email}) - 
            <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {admin?.role === 'super_admin' ? 'スーパー管理者' : '管理者'}
            </span>
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('stores')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stores'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              店舗管理
            </button>
                  <button
                    onClick={() => setActiveTab('upload-stats')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'upload-stats'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    アップロード統計
                  </button>
                  <button
                    onClick={() => setActiveTab('google-accounts')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'google-accounts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Googleアカウント管理
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'profile'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    プロフィール
                  </button>
          </nav>
        </div>

        {/* 店舗管理タブ */}
        {activeTab === 'stores' && (
          <>
            {/* 統計情報 */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">総店舗数</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.totalStores}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">アクティブ店舗</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.activeStores}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">無効店舗</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.inactiveStores}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">今月新規</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.storesCreatedThisMonth}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 店舗一覧 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">店舗一覧</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">登録されている店舗の一覧と管理操作</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {stores.map((store) => (
                  <li key={store.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                store.enabled 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {store.enabled ? 'アクティブ' : '無効'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {store.companyName} - {store.storeName}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                担当者: {store.contactName} ({store.contactEmail})
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">ストアトークン:</span> {store.storeToken}
                            </p>
                            {store.notifyEmail && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">通知メール:</span> {store.notifyEmail}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">作成日:</span> {new Date(store.createdAt).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleStoreStatus(store.id)}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                              store.enabled
                                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {store.enabled ? '無効化' : '有効化'}
                          </button>
                          <button
                            onClick={() => regenerateToken(store.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            トークン再生成
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* アップロード統計タブ */}
        {activeTab === 'upload-stats' && (
          <>
            {/* フィルター */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">フィルター</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">開始日</label>
                  <input
                    type="date"
                    value={filter.startDate || ''}
                    onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">終了日</label>
                  <input
                    type="date"
                    value={filter.endDate || ''}
                    onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 全体統計 */}
            {overallStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">総アップロード数</dt>
                          <dd className="text-lg font-medium text-gray-900">{overallStats.totalUploads}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">成功率</dt>
                          <dd className="text-lg font-medium text-gray-900">{overallStats.successRate.toFixed(1)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">総ファイルサイズ</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatFileSize(overallStats.totalSize)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">平均ファイルサイズ</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatFileSize(overallStats.averageSize)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 店舗別統計 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">店舗別アップロード統計</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">各店舗のアップロード実績</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店舗</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アップロード数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成功率</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">総サイズ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新アップロード</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadStats.map((stat) => (
                      <tr key={stat.storeId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{stat.companyName}</div>
                            <div className="text-sm text-gray-500">{stat.storeName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{stat.totalUploads}</div>
                          <div className="text-sm text-gray-500">成功: {stat.totalSuccess} / 失敗: {stat.totalFailed}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${stat.successRate >= 90 ? 'text-green-600' : stat.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stat.successRate.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(stat.totalSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.lastUploadDate ? new Date(stat.lastUploadDate).toLocaleDateString('ja-JP') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 日別統計グラフ */}
            {dailyStats.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">日別アップロード推移</h3>
                <div className="space-y-4">
                  {dailyStats.slice(-10).map((daily) => (
                    <div key={daily.date} className="flex items-center">
                      <div className="w-24 text-sm text-gray-600">
                        {new Date(daily.date).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (daily.totalUploads / Math.max(...dailyStats.map(d => d.totalUploads))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-20 text-sm text-gray-900 text-right">
                        {daily.totalUploads}件
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ページネーション（店舗管理タブのみ） */}
        {activeTab === 'stores' && totalPages > 1 && (
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

        {/* Googleアカウント管理タブ */}
        {activeTab === 'google-accounts' && (
          <GoogleAccountManagement />
        )}

        {/* プロフィールタブ */}
        {activeTab === 'profile' && (
          <AdminProfile />
        )}
      </div>
    </div>
  );
}

// AdminAuthGuardでラップ
export default function AdminDashboardWithAuth() {
  return (
    <AdminAuthGuard>
      <AdminDashboard />
    </AdminAuthGuard>
  );
}