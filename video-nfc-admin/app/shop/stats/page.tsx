'use client';

import { useState } from 'react';
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
  
  const { stats, isLoading, error, refetch } = useShopStats();

  // 期間フィルターのリセット
  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // 期間フィルターの適用
  const applyFilter = () => {
    setShowFilter(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '1時間未満前';
    if (diffInHours < 24) return `${diffInHours}時間前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}日前`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}週間前`;
  };

  if (!user?.groups?.includes('shop-user')) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">
            <p className="text-gray-600">このページは販売店ユーザーのみアクセス可能です。</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">統計データを読み込み中...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || '統計データの取得に失敗しました'}</p>
            <div className="text-sm text-gray-600 mb-4">
              <p>エラーの詳細:</p>
              <pre className="text-left bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!stats) return null;

  return (
    <ProtectedRoute>
      <Layout>
        {/* ページヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="ダッシュボードに戻る"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">ダッシュボード</span>
            </button>
            
            <span className="text-lg text-gray-400">/</span>
            <span className="text-xl font-bold text-gray-900">アップロード統計</span>
          </div>

          {/* 期間フィルターボタン */}
          <div className="flex items-center space-x-2">
            {(startDate || endDate) && (
              <span className="text-sm text-gray-600">
                {startDate && endDate 
                  ? `${startDate} 〜 ${endDate}`
                  : startDate 
                  ? `${startDate} 以降`
                  : `${endDate} 以前`
                }
              </span>
            )}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-4 h-4 mr-1" />
              期間指定
            </button>
          </div>
        </div>

        {/* 期間フィルターパネル */}
        {showFilter && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">期間を指定</h3>
              <button
                onClick={() => setShowFilter(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setShowFilter(false)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={resetFilter}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 transition-colors"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総アップロード数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今月のアップロード</p>
                <p className="text-2xl font-bold text-gray-900">{stats.monthlyVideos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今週のアップロード</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyVideos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <HardDrive className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総容量使用量</p>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 月別推移グラフ */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            月別アップロード推移
          </h3>
          <div className="h-64 flex items-end space-x-4">
            {stats.monthlyTrend.map((month, index) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                {month.count > 0 ? (
                  <div
                    className="bg-blue-500 w-full rounded-t"
                    style={{ 
                      height: `${Math.max(20, (month.count / Math.max(...stats.monthlyTrend.map(m => m.count))) * 200)}px` 
                    }}
                    title={`${month.month}: ${month.count}本`}
                  ></div>
                ) : (
                  <div
                    className="w-full h-1 bg-gray-200 rounded"
                    title={`${month.month}: ${month.count}本`}
                  ></div>
                )}
                <span className="text-xs text-gray-600 mt-2">{month.month}</span>
                <span className="text-xs text-gray-500">{month.count}本</span>
              </div>
            ))}
          </div>
        </div>

        {/* 最新アップロード動画 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            最新のアップロード動画
          </h3>
          <div className="space-y-4">
            {stats.recentVideos.map((video) => (
              <div key={video.videoId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{video.title}</h4>
                  <p className="text-sm text-gray-600">{video.fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(video.fileSize)} • {formatRelativeTime(video.uploadDate)}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/watch/${video.videoId}`)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  視聴
                </button>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
