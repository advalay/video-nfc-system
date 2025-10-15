'use client';

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '../../../components/Layout';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { Building2, Plus, Edit, Trash2, Store, ChevronDown, ChevronRight, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { Organization, Shop } from '../../../types/shared';

// モック組織データを生成する関数
function getMockOrganizations(): Organization[] {
  return [
    {
      organizationId: 'org-001',
      organizationName: '株式会社サンプル企業A',
      shopCount: 3,
      totalVideos: 67,
      totalSize: 1.2 * 1024 * 1024 * 1024, // 1.2GB
      monthlyVideos: 12,
      weeklyVideos: 4,
      status: 'active',
      createdAt: '2024-01-15T09:00:00Z',
      shops: [
        {
          shopId: 'shop-001',
          shopName: 'サンプル店舗A-1',
          organizationId: 'org-001',
          totalVideos: 25,
          totalSize: 500 * 1024 * 1024, // 500MB
          monthlyVideos: 5,
          weeklyVideos: 2,
          status: 'active',
          createdAt: '2024-01-15T09:00:00Z'
        },
        {
          shopId: 'shop-002',
          shopName: 'サンプル店舗A-2',
          organizationId: 'org-001',
          totalVideos: 22,
          totalSize: 400 * 1024 * 1024, // 400MB
          monthlyVideos: 4,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2024-01-15T09:00:00Z'
        },
        {
          shopId: 'shop-003',
          shopName: 'サンプル店舗A-3',
          organizationId: 'org-001',
          totalVideos: 20,
          totalSize: 300 * 1024 * 1024, // 300MB
          monthlyVideos: 3,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2024-01-15T09:00:00Z'
        }
      ]
    },
    {
      organizationId: 'org-002',
      organizationName: '株式会社サンプル企業B',
      shopCount: 3,
      totalVideos: 52,
      totalSize: 800 * 1024 * 1024, // 800MB
      monthlyVideos: 8,
      weeklyVideos: 2,
      status: 'active',
      createdAt: '2024-02-01T10:00:00Z',
      shops: [
        {
          shopId: 'shop-004',
          shopName: 'サンプル店舗B-1',
          organizationId: 'org-002',
          totalVideos: 18,
          totalSize: 300 * 1024 * 1024, // 300MB
          monthlyVideos: 3,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2024-02-01T10:00:00Z'
        },
        {
          shopId: 'shop-005',
          shopName: 'サンプル店舗B-2',
          organizationId: 'org-002',
          totalVideos: 17,
          totalSize: 250 * 1024 * 1024, // 250MB
          monthlyVideos: 3,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2024-02-01T10:00:00Z'
        },
        {
          shopId: 'shop-006',
          shopName: 'サンプル店舗B-3',
          organizationId: 'org-002',
          totalVideos: 17,
          totalSize: 250 * 1024 * 1024, // 250MB
          monthlyVideos: 2,
          weeklyVideos: 0,
          status: 'active',
          createdAt: '2024-02-01T10:00:00Z'
        }
      ]
    },
    {
      organizationId: 'org-003',
      organizationName: '株式会社サンプル企業C',
      shopCount: 2,
      totalVideos: 37,
      totalSize: 400 * 1024 * 1024, // 400MB
      monthlyVideos: 3,
      weeklyVideos: 1,
      status: 'active',
      createdAt: '2024-03-01T11:00:00Z',
      shops: [
        {
          shopId: 'shop-007',
          shopName: 'サンプル店舗C-1',
          organizationId: 'org-003',
          totalVideos: 20,
          totalSize: 250 * 1024 * 1024, // 250MB
          monthlyVideos: 2,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2024-03-01T11:00:00Z'
        },
        {
          shopId: 'shop-008',
          shopName: 'サンプル店舗C-2',
          organizationId: 'org-003',
          totalVideos: 17,
          totalSize: 150 * 1024 * 1024, // 150MB
          monthlyVideos: 1,
          weeklyVideos: 0,
          status: 'active',
          createdAt: '2024-03-01T11:00:00Z'
        }
      ]
    }
  ];
}

// ユーティリティはコンポーネント外に定義し、再生成を避ける
const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(2)} ${sizes[i]}`;
};

// 店舗のID/PASS生成（モック）
const generateShopCredentials = (shop: Shop) => {
  const email = `${shop.shopId}@${shop.organizationId}.com`;
  const password = `shop_${shop.shopId.slice(-6)}_${Math.random().toString(36).slice(-4)}`;
  return { email, password };
};

type ShopRowProps = {
  shop: Shop;
  onShowCredentials: (shop: Shop) => void;
  onEditShop: (shop: Shop) => void;
  onDeleteShop: (shop: Shop) => void;
};

const ShopRow = memo(function ShopRow({ shop, onShowCredentials, onEditShop, onDeleteShop }: ShopRowProps) {
  return (
    <tr className="hover:bg-gray-50">
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
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          shop.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {shop.status === 'active' ? '有効' : '無効'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onShowCredentials(shop)}
            className="text-blue-600 hover:text-blue-900 p-1"
            title="ID/PASS表示"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditShop(shop)}
            className="text-gray-600 hover:text-gray-900 p-1"
            title="編集"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteShop(shop)}
            className="text-red-600 hover:text-red-900 p-1"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

type OrgRowProps = {
  org: Organization;
  expanded: boolean;
  onToggle: (orgId: string) => void;
  onShowCredentials: (shop: Shop) => void;
  onEditShop: (shop: Shop) => void;
  onDeleteShop: (shop: Shop) => void;
};

const OrganizationRow = memo(function OrganizationRow({ 
  org, 
  expanded, 
  onToggle, 
  onShowCredentials, 
  onEditShop, 
  onDeleteShop 
}: OrgRowProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 組織行 */}
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
            <p className="text-gray-500">販売店数</p>
            <p className="font-semibold text-gray-900">{org.shopCount}店</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">総動画数</p>
            <p className="font-semibold text-gray-900">{org.totalVideos}本</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">総容量</p>
            <p className="font-semibold text-gray-900">{formatFileSize(org.totalSize)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">今月</p>
            <p className="font-semibold text-gray-900">{org.monthlyVideos}本</p>
          </div>
        </div>
      </div>

      {/* 店舗詳細（展開時） */}
      {expanded && (
        <div className="bg-white border-t">
          {org.shops && org.shops.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    店舗名
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {org.shops.map((shop) => (
                  <ShopRow
                    key={shop.shopId}
                    shop={shop}
                    onShowCredentials={onShowCredentials}
                    onEditShop={onEditShop}
                    onDeleteShop={onDeleteShop}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500">店舗データがありません</div>
          )}
        </div>
      )}
    </div>
  );
});

export default function OrganizationsPage() {
  const router = useRouter();
  const userInfo = { groups: ['system-admin'] };

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // システム管理者の権限チェック
  const isSystemAdmin = userInfo?.groups?.includes('system-admin');

  // 組織データを取得
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 開発環境ではモックデータを使用
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Using mock organization data');
          setOrganizations(getMockOrganizations());
          return;
        }
        
        // 本番環境ではAPI呼び出し
        const { apiGet } = await import('../../../lib/api-client');
        const response = await apiGet<{ organizations: Organization[] }>('/organizations');
        setOrganizations(response.organizations || []);
      } catch (err: any) {
        console.error('Error fetching organizations:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isSystemAdmin) {
      fetchOrganizations();
    }
  }, [isSystemAdmin]);

  // 同時に1組織のみ展開するように制限
  const toggleOrganization = useCallback((orgId: string) => {
    setExpandedOrgs(prev => {
      const newExpanded = new Set<string>();
      if (!prev.has(orgId)) {
        newExpanded.add(orgId);
      }
      return newExpanded;
    });
  }, []);

  const handleShowCredentials = useCallback((shop: Shop) => {
    setSelectedShop(shop);
    setShowCredentialsModal(true);
    setShowPassword(false);
  }, []);

  const handleEditShop = useCallback((shop: Shop) => {
    console.log('Edit shop:', shop);
    // TODO: 店舗編集モーダルを開く
  }, []);

  const handleDeleteShop = useCallback((shop: Shop) => {
    if (confirm(`「${shop.shopName}」を削除しますか？`)) {
      console.log('Delete shop:', shop);
      // TODO: 店舗削除のAPI呼び出し
    }
  }, []);

  const handleCopyCredentials = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleResetPassword = useCallback((shop: Shop) => {
    if (confirm(`「${shop.shopName}」のパスワードをリセットしますか？`)) {
      console.log('Reset password for shop:', shop);
      // TODO: パスワードリセットのAPI呼び出し
      alert('パスワードをリセットしました');
    }
  }, []);

  if (!isSystemAdmin) {
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
            <p className="text-gray-600">組織データを読み込み中...</p>
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
            <p className="text-red-600 mb-4">{error?.message || '組織データの取得に失敗しました'}</p>
            <div className="text-sm text-gray-600 mb-4">
              <p>API接続を確認してください</p>
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

  return (
    <ProtectedRoute allowedRoles={['system-admin']}>
      <Layout>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">組織管理</h1>
              <p className="text-gray-600">パートナー企業と店舗の管理、ID/PASSの発行・管理を行います</p>
            </div>
            <button
              onClick={() => console.log('Create organization')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新規組織追加</span>
            </button>
          </div>

          {/* 組織一覧 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">組織一覧</h2>
            </div>

            <div className="p-6">
              <div className="space-y-2">
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <OrganizationRow
                      key={org.organizationId}
                      org={org}
                      expanded={expandedOrgs.has(org.organizationId)}
                      onToggle={toggleOrganization}
                      onShowCredentials={handleShowCredentials}
                      onEditShop={handleEditShop}
                      onDeleteShop={handleDeleteShop}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    組織データがありません。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ID/PASS表示モーダル */}
        {showCredentialsModal && selectedShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedShop.shopName} - ログイン情報
                </h3>
                <button
                  onClick={() => setShowCredentialsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {(() => {
                const credentials = generateShopCredentials(selectedShop);
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        メールアドレス（ID）
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={credentials.email}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => handleCopyCredentials(credentials.email)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                          title="コピー"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        パスワード
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                          title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyCredentials(credentials.password)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                          title="コピー"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => handleResetPassword(selectedShop)}
                        className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        パスワードリセット
                      </button>
                      <button
                        onClick={() => setShowCredentialsModal(false)}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}