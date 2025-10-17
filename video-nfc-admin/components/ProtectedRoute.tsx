'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isMockMode = process.env.NEXT_PUBLIC_AUTH_MODE === 'mock';

  useEffect(() => {
    if (isLoading) return;

    // Mock modeの場合は認証チェックをスキップ
    if (isMockMode) {
      // allowedRolesチェックのみ実施
      if (allowedRoles && user && !allowedRoles.some(role => user.groups.includes(role))) {
        router.push('/videos');
      }
      return;
    }

    // Cognito認証モード: 未認証の場合はログインページにリダイレクト
    if (!user) {
      router.push('/login');
      return;
    }

    // 権限チェック
    if (allowedRoles && !allowedRoles.some(role => user.groups.includes(role))) {
      router.push('/videos');
    }
  }, [user, isLoading, router, allowedRoles, isMockMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mock modeまたは認証済み
  if (isMockMode || user) {
    return <>{children}</>;
  }

  return null;
}
