'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { configureAmplify } from '../lib/amplify-config';
import toast from 'react-hot-toast';
import { LogOut, Video, Building2, Upload, BarChart3, AlertTriangle, Users } from 'lucide-react';

// ユーザーコンテキスト
const UserContext = createContext<any>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 動的ユーザー切り替え（テスト用）
  const [currentUserType, setCurrentUserType] = useState<'system-admin' | 'organization-admin' | 'shop-user'>('system-admin');
  
  const userInfo = {
    'system-admin': {
      email: 'system-admin@example.com',
      groups: ['system-admin'],
      organizationId: 'SYSTEM',
      shopId: '',
      role: 'system-admin',
      organizationName: 'SYSTEM',
      userId: 'system-admin-001'
    },
    'organization-admin': {
      email: 'orga-admin@example.com',
      groups: ['organization-admin'],
      organizationId: 'ORG_A',
      shopId: '',
      role: 'organization-admin',
      organizationName: 'パートナー企業A',
      userId: 'orga-admin-001'
    },
    'shop-user': {
      email: 'shop-a1@example.com',
      groups: ['shop-user'],
      organizationId: 'ORG_A',
      shopId: 'SHOP_A1',
      role: 'shop-user',
      organizationName: 'パートナー企業A',
      userId: 'shop-a1-001'
    }
  }[currentUserType];

  const isSystemAdmin = userInfo?.groups?.includes('system-admin');
  const isOrganizationAdmin = userInfo?.groups?.includes('organization-admin');

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
      href: '/shop/stats',
      label: '販売店統計',
      icon: BarChart3,
      show: isOrganizationAdmin,
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
    <UserContext.Provider value={userInfo}>
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
              <p className="text-sm font-medium text-gray-900">{userInfo.organizationName}</p>
              <p className="text-xs text-gray-500">{userInfo.email}</p>
            </div>
          </div>
          
          {/* ユーザー切り替えボタン（テスト用） */}
          <div className="mt-3 space-y-1">
            <button
              onClick={() => {
                setCurrentUserType('system-admin');
                localStorage.setItem('currentUserType', 'system-admin');
                window.dispatchEvent(new Event('userTypeChanged'));
              }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${
                currentUserType === 'system-admin' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              システム管理者
            </button>
            <button
              onClick={() => {
                setCurrentUserType('organization-admin');
                localStorage.setItem('currentUserType', 'organization-admin');
                window.dispatchEvent(new Event('userTypeChanged'));
              }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${
                currentUserType === 'organization-admin' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              パートナー親
            </button>
            <button
              onClick={() => {
                setCurrentUserType('shop-user');
                localStorage.setItem('currentUserType', 'shop-user');
                window.dispatchEvent(new Event('userTypeChanged'));
              }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${
                currentUserType === 'shop-user' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              販売店ユーザー
            </button>
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
    </UserContext.Provider>
  );
}