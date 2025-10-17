'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { Video, Building2, Upload, BarChart3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, switchUser } = useAuth();

  const isSystemAdmin = user?.groups?.includes('system-admin');
  const isOrganizationAdmin = user?.groups?.includes('organization-admin');
  const enableUserSwitching = process.env.NEXT_PUBLIC_ENABLE_USER_SWITCHING === 'true';

  const navItems = [
    {
      href: '/videos',
      label: '動画一覧',
      icon: Video,
      show: true,
    },
    {
      href: '/upload',
      label: '動画アップロード',
      icon: Upload,
      show: true,
    },
    {
      href: '/shop/stats',
      label: '販売店統計',
      icon: BarChart3,
      show: isOrganizationAdmin || isSystemAdmin,
    },
    {
      href: '/admin/organizations',
      label: '組織管理',
      icon: Building2,
      show: isSystemAdmin,
    },
    {
      href: '/admin/system-stats',
      label: 'システム統計',
      icon: BarChart3,
      show: isSystemAdmin,
    },
    {
      href: '/admin/errors',
      label: 'エラー監視',
      icon: AlertTriangle,
      show: isSystemAdmin,
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('ログアウトしました');
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('ログアウトに失敗しました');
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* サイドバー */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">動画配信システム</h1>
          <p className="text-sm text-gray-600 mt-1">管理画面</p>
        </div>

        {/* ユーザー情報 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.organizationName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          
          {/* ユーザー切り替えボタン（テスト用） */}
          {enableUserSwitching && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500 mb-2">テストユーザー切り替え</p>
              <button
                onClick={() => switchUser('system-admin')}
                className={`w-full text-left px-2 py-1 text-xs rounded ${
                  user.groups.includes('system-admin')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                システム管理者
              </button>
              <button
                onClick={() => switchUser('organization-admin')}
                className={`w-full text-left px-2 py-1 text-xs rounded ${
                  user.groups.includes('organization-admin')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                パートナー親
              </button>
              <button
                onClick={() => switchUser('shop-user')}
                className={`w-full text-left px-2 py-1 text-xs rounded ${
                  user.groups.includes('shop-user')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                販売店ユーザー
              </button>
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        <nav className="mt-6">
          {navItems.map((item) => {
            if (!item.show) return null;
            
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                } hover:bg-gray-50`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ログアウトボタン */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="ml-64">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
