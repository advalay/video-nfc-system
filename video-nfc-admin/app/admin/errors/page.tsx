'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { AlertTriangle, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Layout } from '../../../components/Layout';
import { ProtectedRoute } from '../../../components/ProtectedRoute';

interface ErrorLog {
  timestamp: string;
  functionName: string;
  errorMessage: string;
  requestId: string;
  userId?: string;
  organizationId?: string;
  path?: string;
  method?: string;
}

export default function ErrorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 権限チェック
  useEffect(() => {
    if (!user || !user.groups?.includes('system-admin')) {
      router.push('/videos');
    }
  }, [user, router]);

  // CloudWatch ダッシュボードへのリンク
  const cloudWatchDashboardUrl = `https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=video-nfc-dev-errors`;
  
  // CloudWatch Logs Insights へのリンク
  const logsInsightsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:logs-insights`;

  const handleRefresh = () => {
    // 実際の実装では CloudWatch Logs API を呼び出してエラーログを取得
    setIsLoading(true);
    setTimeout(() => {
      // モックデータ
      setErrors([
        {
          timestamp: new Date().toISOString(),
          functionName: 'getAdminStats',
          errorMessage: 'DynamoDB接続エラー',
          requestId: 'abc-123-def-456',
          userId: 'user-001',
          organizationId: 'org-001',
          path: '/admin/stats',
          method: 'GET',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const filteredErrors = errors.filter(error =>
    error.errorMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    error.functionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    error.requestId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ローディング状態は不要（ユーザーコンテキストは即座に利用可能）

  return (
    <ProtectedRoute allowedRoles={['system-admin']}>
      <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">エラー監視ダッシュボード</h1>
            <p className="text-gray-600 mt-2">システムエラーの監視と詳細確認</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>更新</span>
            </button>
          </div>
        </div>

        {/* CloudWatch へのクイックリンク */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={cloudWatchDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
          >
            <div>
              <h3 className="text-lg font-semibold">CloudWatch ダッシュボード</h3>
              <p className="text-sm text-blue-100 mt-1">リアルタイムメトリクスとグラフを表示</p>
            </div>
            <ExternalLink className="w-6 h-6" />
          </a>

          <a
            href={logsInsightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
          >
            <div>
              <h3 className="text-lg font-semibold">Logs Insights クエリ</h3>
              <p className="text-sm text-purple-100 mt-1">エラーログを詳細に検索・分析</p>
            </div>
            <ExternalLink className="w-6 h-6" />
          </a>
        </div>

        {/* アラート設定情報 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-yellow-800">アラート通知設定</h3>
              <p className="text-yellow-700 mt-2">
                以下の条件でメール通知が送信されます：
              </p>
              <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
                <li>Lambda関数エラー: 1分間に5回以上</li>
                <li>API Gateway 5xxエラー: 1分間に5回以上</li>
                <li>API Gateway 4xxエラー: 5分間に50回以上</li>
                <li>Lambda実行時間超過: 平均20秒以上（5分間）</li>
                <li>Lambdaスロットリング: 1分間に3回以上</li>
              </ul>
              <p className="text-sm text-yellow-600 mt-3">
                ※ アラートメールには requestId とエラー詳細が含まれます
              </p>
            </div>
          </div>
        </div>

        {/* エラーログ検索 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="エラーメッセージ、関数名、リクエストIDで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* エラーログ一覧 */}
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">エラーログがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                CloudWatch Logs Insights で詳細なエラーログを確認できます
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((error, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-900">{error.functionName}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(error.timestamp).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-red-800 mt-2">{error.errorMessage}</p>
                      <div className="flex items-center space-x-6 mt-3 text-sm text-gray-600">
                        <span>RequestID: <code className="bg-white px-2 py-1 rounded">{error.requestId}</code></span>
                        {error.method && error.path && (
                          <span>{error.method} {error.path}</span>
                        )}
                        {error.userId && (
                          <span>User: {error.userId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* エラー調査手順 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">エラー調査手順</h3>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              <strong>CloudWatch Alarms</strong> でアラートが発生したら、メールで通知されます
            </li>
            <li>
              <strong>CloudWatch Logs Insights</strong> を開き、事前定義されたクエリ「{'{function-name}'}-errors」を実行
            </li>
            <li>
              エラーログから <strong>requestId</strong> と <strong>スタックトレース</strong> を確認
            </li>
            <li>
              該当するLambda関数のコードを確認し、エラー箇所を特定
            </li>
            <li>
              修正後、再デプロイして動作確認
            </li>
          </ol>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}


