'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface HealthStatus {
    api: 'checking' | 'healthy' | 'error';
    auth: 'checking' | 'healthy' | 'error';
    lastChecked: Date | null;
}

export default function SystemHealthPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const [health, setHealth] = useState<HealthStatus>({
        api: 'checking',
        auth: 'checking',
        lastChecked: null,
    });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 管理者のみアクセス可能
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
        if (!authLoading && user && !user.groups.includes('system-admin') && !user.groups.includes('organization-admin')) {
            toast.error('管理者のみアクセスできます');
            router.push('/videos');
        }
    }, [authLoading, isAuthenticated, user, router]);

    const checkHealth = async () => {
        setIsRefreshing(true);
        setHealth(prev => ({ ...prev, api: 'checking', auth: 'checking' }));

        // API Health Check
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://rwwiyktk7e.execute-api.ap-northeast-1.amazonaws.com/dev';
            const response = await fetch(`${apiUrl}/videos?limit=1`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            setHealth(prev => ({ ...prev, api: response.ok || response.status === 401 ? 'healthy' : 'error' }));
        } catch {
            setHealth(prev => ({ ...prev, api: 'error' }));
        }

        // Auth Check (if logged in, auth is working)
        setHealth(prev => ({
            ...prev,
            auth: isAuthenticated ? 'healthy' : 'error',
            lastChecked: new Date(),
        }));

        setIsRefreshing(false);
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            checkHealth();
        }
    }, [authLoading, isAuthenticated]);

    const getStatusColor = (status: 'checking' | 'healthy' | 'error') => {
        switch (status) {
            case 'healthy': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-yellow-500 animate-pulse';
        }
    };

    const getStatusText = (status: 'checking' | 'healthy' | 'error') => {
        switch (status) {
            case 'healthy': return '正常';
            case 'error': return 'エラー';
            default: return '確認中...';
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">システムステータス</h1>
                    <p className="mt-2 text-gray-600">システムの稼働状況を確認できます</p>
                </div>

                {/* ステータスカード */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* API Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">API Gateway</h3>
                                <p className="text-sm text-gray-500">バックエンドAPI接続</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.api)}`}></div>
                                <span className="text-sm font-medium">{getStatusText(health.api)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Auth Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">認証サービス</h3>
                                <p className="text-sm text-gray-500">Cognito認証</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.auth)}`}></div>
                                <span className="text-sm font-medium">{getStatusText(health.auth)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">ステータス更新</h3>
                            {health.lastChecked && (
                                <p className="text-sm text-gray-500">
                                    最終確認: {health.lastChecked.toLocaleTimeString('ja-JP')}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={checkHealth}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isRefreshing ? '確認中...' : '再確認'}
                        </button>
                    </div>
                </div>

                {/* User Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">ログイン情報</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm text-gray-500">メールアドレス</dt>
                            <dd className="text-gray-900 font-medium">{user?.email}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">ロール</dt>
                            <dd className="text-gray-900 font-medium">{user?.groups.join(', ') || 'なし'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">組織ID</dt>
                            <dd className="text-gray-900 font-medium">{user?.organizationId || '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gray-500">組織名</dt>
                            <dd className="text-gray-900 font-medium">{user?.organizationName || '-'}</dd>
                        </div>
                    </dl>
                </div>

                {/* Admin Links */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">管理リンク</h3>
                    <div className="space-y-3">
                        <a
                            href="https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#alarmsV2:"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="font-medium text-gray-900">CloudWatch アラーム</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <a
                            href="https://ap-northeast-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=ap-northeast-1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <span className="font-medium text-gray-900">Cognito ユーザー管理</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
