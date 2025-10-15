'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useSystemStats, OrganizationStat } from '../../../hooks/useSystemStats';
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
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(2)} ${sizes[i]}`;
};

type OrgRowProps = {
  org: OrganizationStat;
  expanded: boolean;
  onToggle: (orgId: string) => void;
};

const OrganizationRow = memo(function OrganizationRow({ org, expanded, onToggle }: OrgRowProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 企業行 */}
      <div
        onClick={() => onToggle(org.organizationId)}
        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
      >
        <div className="flex items-center space-x-3 flex-1">
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={(e) => { e.stopPropagation(); onToggle(org.organizationId); }}
            aria-label={expanded ? '折りたたむ' : '展開する'}
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          <Building2 className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">{org.organizationName}</span>
        </div>

        <div className="flex items-center space-x-6 text-sm">
          <div className="text-right">
            <p className="text-gray-500">総動画数</p>
            <p className="font-semibold text-gray-900">{org.totalVideos}本</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">総容量</p>
            <p className="font-semibold text-gray-900">{formatFileSize(org.totalSize)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">販売店数</p>
            <p className="font-semibold text-gray-900">{org.shopCount}店</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">今月</p>
            <p className="font-semibold text-gray-900">{org.monthlyVideos}本</p>
          </div>
        </div>
      </div>

      {/* 販売店詳細（展開時） */}
      {expanded && (
        <div className="bg-white border-t">
          {org.shops && org.shops.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    販売店名
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総動画数
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総容量
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    今月の動画数
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    今週の動画数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {org.shops.map((shop) => (
                  <tr key={shop.shopId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Store className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{shop.shopName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shop.totalVideos}本</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatFileSize(shop.totalSize)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shop.monthlyVideos}本</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shop.weeklyVideos}本</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500">販売店データがありません</div>
          )}
        </div>
      )}
    </div>
  );
});

export default function SystemStatsPage() {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const { data: stats, isLoading, error } = useSystemStats(startDate, endDate);

  // 月次グラフ用の最大値計算はメモ化して不要な再計算を防ぐ
  const maxMonthlyCount = useMemo(() => {
    if (!stats?.monthlyTrend?.length) return 0;
    return stats.monthlyTrend.reduce((max, m) => (m.count > max ? m.count : max), 0);
  }, [stats?.monthlyTrend]);

  const resetFilter = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  // 同時に1社のみ展開するように制限
  const toggleOrganization = useCallback((orgId: string) => {
    setExpandedOrgs(prev => {
      const newExpanded = new Set<string>();
      if (!prev.has(orgId)) {
        newExpanded.add(orgId);
      }
      return newExpanded;
    });
  }, []);

  if (userInfo?.role !== 'system-admin' && !userInfo?.groups?.includes('system-admin')) {
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
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">システム統計データを読み込み中...</p>
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
            <p className="text-red-600 mb-4">{error.message || 'システム統計データの取得に失敗しました'}</p>
            <div className="text-sm text-gray-600 mb-4">
              <p>エラーの詳細:</p>
              <pre className="text-left bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="text-center py-8">
            <p className="text-gray-600">システム統計データがありません。</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['system-admin']}>
      <Layout>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">システム統計</h1>
              <p className="text-gray-600">システム全体の統計情報を表示します</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>フィルター</span>
              </button>
              <button
                onClick={() => router.push('/videos')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>動画一覧に戻る</span>
              </button>
            </div>
          </div>

          {/* フィルター */}
          {showFilter && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">期間フィルター</h3>
                <button
                  onClick={() => setShowFilter(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={resetFilter}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    リセット
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Building2 className="w-6 h-6 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">パートナー企業数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrganizations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Store className="w-6 h-6 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">販売店数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalShops}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Video className="w-6 h-6 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">総動画数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <HardDrive className="w-6 h-6 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">総容量使用量</p>
                  <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-pink-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">今月の動画数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMonthlyVideos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">今週の動画数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalWeeklyVideos}</p>
                </div>
              </div>
            </div>
          </div>

          {/* パートナー企業別統計（階層展開） */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              パートナー企業別統計
            </h3>

            <div className="space-y-2">
              {stats.organizationStats.length > 0 ? (
                stats.organizationStats.map((org) => (
                  <OrganizationRow
                    key={org.organizationId}
                    org={org}
                    expanded={expandedOrgs.has(org.organizationId)}
                    onToggle={toggleOrganization}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  パートナー企業データがありません。
                </div>
              )}
            </div>
          </div>

          {/* 月別アップロード推移 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              月別アップロード推移
            </h3>
            <div className="h-64 flex items-end space-x-4">
              {stats.monthlyTrend.map((month) => {
                const height = maxMonthlyCount > 0 ? (month.count / maxMonthlyCount) * 200 : 0;
                
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center">
                    {month.count > 0 ? (
                      <div
                        className="bg-blue-500 w-full rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                        style={{
                          height: `${Math.max(20, height)}px`
                        }}
                        title={`${month.month}: ${month.count}本 (${formatFileSize(month.size)})`}
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
                );
              })}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}