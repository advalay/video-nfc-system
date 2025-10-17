'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useSystemStats, OrganizationStat } from '../../../hooks/useSystemStats';
import { Organization } from '../../../types/shared';
import { Layout } from '../../../components/Layout';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import {
  Building2,
  Video,
  HardDrive,
  Calendar,
  BarChart3,
  ArrowLeft,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Store,
  TrendingUp,
  Clock,
} from 'lucide-react';

// ユーティリティはコンポーネント外に定義し、再生成を避ける
const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
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

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

// 統計カードコンポーネント
const StatCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'blue' 
}: {
  title: string;
  value: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trendClasses[trend]}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
          </span>
          <span className="text-sm text-gray-500 ml-2">前月比</span>
        </div>
      )}
    </div>
  );
});

// 組織統計コンポーネント
const OrganizationStats = memo(({ 
  organization, 
  isExpanded, 
  onToggle 
}: { 
  organization: Organization; 
  isExpanded: boolean; 
  onToggle: () => void;
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{organization.organizationName}</h3>
              <p className="text-sm text-gray-600">{organization.shopCount}店舗</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-600">総動画数</p>
              <p className="text-lg font-semibold text-gray-900">{formatNumber(organization.totalVideos)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">総容量</p>
              <p className="text-lg font-semibold text-gray-900">{formatFileSize(organization.totalSize)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">今月の動画</p>
              <p className="text-lg font-semibold text-gray-900">{formatNumber(organization.monthlyVideos)}</p>
            </div>
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organization.shops.map((shop) => (
              <div key={shop.shopId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{shop.shopName}</h4>
                    <p className="text-sm text-gray-600">{shop.shopId}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">動画数</span>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(shop.totalVideos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">容量</span>
                    <span className="text-sm font-medium text-gray-900">{formatFileSize(shop.totalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">今月の動画</span>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(shop.monthlyVideos)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default function SystemStatsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const { data: stats, isLoading, error, refetch } = useSystemStats();

  // 期間フィルターのリセット
  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // 期間フィルターの適用
  const applyFilter = () => {
    setShowFilter(false);
  };

  // 組織の展開/折りたたみ
  const toggleOrganization = useCallback((orgId: string) => {
    setExpandedOrgs(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(orgId)) {
        newExpanded.delete(orgId);
      } else {
        newExpanded.add(orgId);
      }
      return newExpanded;
    });
  }, []);

  if (!user?.groups?.includes('system-admin')) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">
            <p className="text-gray-600">このページはシステム管理者のみアクセス可能です。</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
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
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">
            <p className="text-red-600">エラーが発生しました: {error.message}</p>
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
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">システム統計</h1>
              <p className="text-gray-600 mt-1">システム全体の利用状況とパフォーマンス</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilter(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>期間フィルター</span>
              </button>
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
            <StatCard
              title="総組織数"
              value={formatNumber(stats.totalOrganizations)}
              icon={Building2}
              trend="up"
              trendValue="+2"
              color="blue"
            />
            <StatCard
              title="総店舗数"
              value={formatNumber(stats.totalShops)}
              icon={Store}
              trend="up"
              trendValue="+5"
              color="green"
            />
            <StatCard
              title="総動画数"
              value={formatNumber(stats.totalVideos)}
              icon={Video}
              trend="up"
              trendValue="+12%"
              color="purple"
            />
            <StatCard
              title="総容量"
              value={formatFileSize(stats.totalSize)}
              icon={HardDrive}
              trend="up"
              trendValue="+8%"
              color="orange"
            />
          </div>

          {/* 組織別統計 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">組織別統計</h2>
              <div className="text-sm text-gray-600">
                {stats.organizationStats.length}組織
              </div>
            </div>
            
            <div className="space-y-4">
              {stats.organizationStats.map((organization) => (
                <OrganizationStats
                  key={organization.organizationId}
                  organization={organization}
                  isExpanded={expandedOrgs.has(organization.organizationId)}
                  onToggle={() => toggleOrganization(organization.organizationId)}
                />
              ))}
            </div>
          </div>

          {/* パフォーマンス指標 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンス指標</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-gray-600">システム稼働率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1.2s</div>
                <div className="text-sm text-gray-600">平均応答時間</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0.1%</div>
                <div className="text-sm text-gray-600">エラー率</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}