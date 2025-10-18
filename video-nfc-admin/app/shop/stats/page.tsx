'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useShopStats } from '../../../hooks/useShopStats';
import { Layout } from '../../../components/Layout';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { 
  Video, 
  Upload, 
  HardDrive, 
  TrendingUp, 
  Calendar,
  Clock,
  BarChart3,
  ArrowLeft,
  Filter,
  X
} from 'lucide-react';

export default function ShopStatsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // 期間選択の状態
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  
  // 販売店名フィルターの状態
  const [shopNameFilter, setShopNameFilter] = useState<string>('');
  
  // ソートの状態
  const [sortBy, setSortBy] = useState<'name' | 'videos' | 'size' | 'monthly'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const { stats, isLoading, error, refetch } = useShopStats();

  // フィルタリングとソート機能
  const filteredAndSortedShops = useMemo(() => {
    if (!stats?.shops) return [];
    
    let filteredShops = stats.shops;
    
    // 販売店名でフィルタリング
    if (shopNameFilter) {
      filteredShops = filteredShops.filter(shop => 
        shop.shopName.toLowerCase().includes(shopNameFilter.toLowerCase())
      );
    }
    
    // ソート
    filteredShops.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.shopName.localeCompare(b.shopName);
          break;
        case 'videos':
          comparison = a.totalVideos - b.totalVideos;
          break;
        case 'size':
          comparison = a.totalSize - b.totalSize;
          break;
        case 'monthly':
          comparison = a.monthlyVideos - b.monthlyVideos;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filteredShops;
  }, [stats?.shops, shopNameFilter, sortBy, sortOrder]);

  // 期間フィルターのリセット
  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // 期間フィルターの適用
  const applyFilter = () => {
    setShowFilter(false);
    // フィルターが適用されたことを示す（実際の実装では、フィルター条件に基づいてデータを再取得）
    console.log('Filter applied:', { startDate, endDate });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return '今日';
    } else if (diffInDays === 1) {
      return '昨日';
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else if (diffInDays < 30) {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks}週間前`;
    } else {
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths}ヶ月前`;
    }
  };

  if (!user?.groups?.includes('shop-user') && !user?.groups?.includes('shop-admin') && !user?.groups?.includes('organization-admin') && !user?.groups?.includes('system-admin')) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin', 'shop-user']}>
        <Layout>
          <div className="text-center py-8">
            <p className="text-gray-600">このページは販売店ユーザー、パートナー企業、またはシステム管理者のみアクセス可能です。</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin', 'shop-user']}>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin', 'shop-user']}>
        <Layout>
          <div className="text-center py-8">
            <p className="text-red-600">エラーが発生しました: {error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!stats) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin', 'shop-user']}>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin', 'shop-user']}>
      <Layout>
        <div className="space-y-8">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">販売店統計</h1>
              <p className="text-gray-600 mt-1">店舗の利用状況とパフォーマンス</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => refetch()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <BarChart3 className="w-4 h-4" />
                <span>更新</span>
              </button>
            </div>
          </div>

          {/* 期間フィルターモーダル */}
          {showFilter && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">期間フィルター</h3>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">終了日</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={resetFilter}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    リセット
                  </button>
                  <button
                    onClick={applyFilter}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    適用
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">総動画数</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.totalVideos)}</p>
                </div>
                <div className="p-3 rounded-lg text-blue-600 bg-blue-50 flex-shrink-0">
                  <Video className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">総容量</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatFileSize(stats.totalSize)}</p>
                </div>
                <div className="p-3 rounded-lg text-green-600 bg-green-50 flex-shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">今月の動画</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.monthlyVideos)}</p>
                </div>
                <div className="p-3 rounded-lg text-purple-600 bg-purple-50 flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">今週の動画</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.weeklyVideos)}</p>
                </div>
                <div className="p-3 rounded-lg text-orange-600 bg-orange-50 flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* 販売店一覧 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">販売店一覧</h2>
              
              {/* フィルター機能を右側に配置 */}
              <div className="flex items-center space-x-3">
                {/* 販売店名フィルター */}
                <input
                  type="text"
                  placeholder="販売店名で検索..."
                  value={shopNameFilter}
                  onChange={(e) => setShopNameFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                
                {/* ソート機能 */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'videos' | 'size' | 'monthly')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="name">名前順</option>
                  <option value="videos">動画数順</option>
                  <option value="size">容量順</option>
                  <option value="monthly">今月の動画数順</option>
                </select>
                
                {/* ソート順序ボタン */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`px-3 py-2 text-sm ${
                      sortOrder === 'asc' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="少ない順"
                  >
                    少ない順
                  </button>
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${
                      sortOrder === 'desc' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="多い順"
                  >
                    多い順
                  </button>
                </div>
                
                <button
                  onClick={() => setShowFilter(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span>期間</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {filteredAndSortedShops && filteredAndSortedShops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedShops.map((shop) => (
                    <div key={shop.shopId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-gray-900 mb-3">{shop.shopName}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">総動画数</span>
                          <span className="font-medium">{shop.totalVideos}本</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">総容量</span>
                          <span className="font-medium">{formatFileSize(shop.totalSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">今月</span>
                          <span className="font-medium">{shop.monthlyVideos}本</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">今週</span>
                          <span className="font-medium">{shop.weeklyVideos}本</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  販売店データがありません
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}