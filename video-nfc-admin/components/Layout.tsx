'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';
import toast from 'react-hot-toast';
import { LogOut, Video, Building2, Upload, BarChart3, AlertTriangle, Users } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // モックユーザー情報
  const userInfo = {
    email: 'system-admin@example.com',
    groups: ['system-admin'],
    organizationId: 'SYSTEM',
    shopId: '',
    role: 'system-admin',
    organizationName: 'SYSTEM',
    userId: 'system-admin-001'
  };

  const isSystemAdmin = userInfo?.groups?.includes('system-admin');

  const navItems = [
    {
      href: '/videos',
      label: '動画一覧',
      icon: Video,
      show: true,
      disabled: false
    },
    {
      href: '/upload',
      label: '動画アップロード',
      icon: Upload,
      show: true,
      disabled: false
    },
    {
      href: '/admin/organizations',
      label: '組織管理',
      icon: Building2,
      show: isSystemAdmin,
      disabled: false
    },
    {
      href: '/admin/system-stats',
      label: 'システム統計',
      icon: BarChart3,
      show: isSystemAdmin,
      disabled: false
    },
    {
      href: '/admin/errors',
      label: 'エラー監視',
      icon: AlertTriangle,
      show: isSystemAdmin,
      disabled: false
    }
  ];

  const handleLogout = async () => {
    try {
      // Amplifyの設定
      configureAmplify();
      
      // AWS Amplifyからサインアウト
      await signOut();
      
      // 成功メッセージ
      toast.success('ログアウトしました');
      
      // ページをリロードしてからログインページにリダイレクト（認証状態を確実にクリア）
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('ログアウトに失敗しました');
      
      // エラーが発生しても強制的にログインページにリダイレクト
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  };

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
              {userInfo.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">システム管理者</p>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <LogOut className="w-3 h-3" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
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
                onClick={() => { if (!item.disabled) router.push(item.href); }}
                aria-disabled={item.disabled}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                title={item.disabled ? '現在このメニューは一時的に無効です' : ''}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
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