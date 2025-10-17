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

  useEffect(() => {
    if (isLoading) return;

    // 未認証の場合はログインページにリダイレクト
    if (!user) {
      router.push('/login');
      return;
    }

    // 権限チェック
    if (allowedRoles && !allowedRoles.some(role => user.groups.includes(role))) {
      router.push('/videos');
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 認証済みの場合のみ表示
  if (user) {
    return <>{children}</>;
  }

  return null;
}
