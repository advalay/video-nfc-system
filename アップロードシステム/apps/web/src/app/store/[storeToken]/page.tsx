'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { UploadState, DetailedError } from '@/types/error';
import { uploadWithRetry, validateFile, validateInputs } from '@/utils/uploadWithRetry';
import ErrorDisplay, { RetryDisplay, ProgressDisplay } from '@/components/ErrorDisplay';

interface YouTubeAuthStatus {
  isAuthenticated: boolean;
  channelInfo: {
    title: string;
    id: string;
  } | null;
  message: string;
}

export default function StoreUploadPage({ params }: { params: { storeToken: string } }) {
  const searchParams = useSearchParams();
  const [serialNo, setSerialNo] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    retryCount: 0,
    maxRetries: 3
  });
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasShownSuccessAlert = useRef(false);

  // URLパラメータからストアトークンを取得（フォールバック付き）
  const storeToken = params?.storeToken || 'store_test_token_001';

  // =============================================================================
  // 認証状態管理
  // =============================================================================

  // URLパラメータから認証結果を処理
  useEffect(() => {
    hasShownSuccessAlert.current = false;

    const auth = searchParams?.get('auth');
    const channel = searchParams?.get('channel');
    const error = searchParams?.get('error');

    if (auth === 'success' && channel && !hasShownSuccessAlert.current) {
      hasShownSuccessAlert.current = true;
      alert(`YouTube認証が完了しました！\nチャンネル: ${decodeURIComponent(channel)}`);
      // 認証状態を更新
      refreshAuthStatus();
    } else if (error) {
      let errorMessage = '認証エラーが発生しました';
      switch (error) {
        case 'invalid_token':
          errorMessage = '無効なストアトークンです';
          break;
        case 'no_code':
          errorMessage = '認証コードが取得できませんでした';
          break;
        case 'oauth_failed':
          errorMessage = 'OAuth認証に失敗しました';
          break;
        case 'no_channel':
          errorMessage = 'チャンネル情報が見つかりません';
          break;
      }
      alert(errorMessage);
    }
  }, [searchParams]);

  // 認証状態を取得
  const refreshAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v1/test/auth-status');
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
      }
    } catch (error) {
      console.error('認証状態の更新に失敗しました:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 初期認証状態取得
  useEffect(() => {
    refreshAuthStatus();
  }, []);

  // =============================================================================
  // 認証処理
  // =============================================================================

  // ログイン処理
  const handleLogin = async () => {
    try {
      console.log('🔑 ログイン開始 - storeToken:', storeToken);
      const response = await fetch('http://localhost:4000/api/v1/channels/oauth/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-token': storeToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ OAuth URL取得成功:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        console.error('❌ OAuth URL取得失敗:', response.status);
        alert('ログインに失敗しました');
      }
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      alert('ログインに失敗しました');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('http://localhost:4000/api/v1/test/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-token': storeToken
        }
      });
      
      if (response.ok) {
        setAuthStatus(null);
        alert('ログアウトが完了しました');
      } else {
        alert('ログアウトに失敗しました');
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // =============================================================================
  // ファイル処理
  // =============================================================================

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // =============================================================================
  // アップロード処理
  // =============================================================================

  const handleUpload = async () => {
    // 入力値のバリデーション
    const inputValidation = validateInputs(title, serialNo);
    if (!inputValidation.valid) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: inputValidation.error,
        retryCount: 0,
        maxRetries: 3
      });
      return;
    }

    // ファイルのバリデーション
    if (!selectedFile) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: {
          type: 'VALIDATION_ERROR' as any,
          code: 'MISSING_FILE',
          message: 'No file selected',
          userMessage: 'ファイルが選択されていません',
          retryable: false,
          suggestedAction: 'アップロードするファイルを選択してください',
          timestamp: new Date()
        },
        retryCount: 0,
        maxRetries: 3
      });
      return;
    }

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.valid) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: fileValidation.error,
        retryCount: 0,
        maxRetries: 3
      });
      return;
    }

    // 認証状態を確認
    if (!authStatus?.isAuthenticated) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: {
          type: 'AUTHENTICATION_ERROR' as any,
          code: 'NOT_AUTHENTICATED',
          message: 'Not authenticated',
          userMessage: 'YouTube認証が必要です',
          retryable: false,
          suggestedAction: '先にログインしてください',
          timestamp: new Date()
        },
        retryCount: 0,
        maxRetries: 3
      });
      return;
    }

    // アップロード開始
    setUploadResult(null);
    
    try {
      const result = await uploadWithRetry(
        async (file, title, serialNo, storeToken) => {
          // 実際のアップロード関数
          const formData = new FormData();
          formData.append('title', title);
          formData.append('serialNo', serialNo);
          formData.append('video', file);

          const response = await fetch('http://localhost:4000/api/v1/public/upload-to-youtube', {
            method: 'POST',
            headers: {
              'X-Store-Token': storeToken,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            (error as any).code = response.status;
            throw error;
          }

          return await response.json();
        },
        selectedFile,
        title,
        serialNo,
        storeToken,
        (state) => {
          // 進捗更新コールバック
          setUploadState(state);
        }
      );

      // 成功時の処理
      console.log('YouTube API レスポンス:', result);
      
      const successMessage = `✅ YouTube動画アップロードが完了しました！

📺 チャンネル: ${result.channel || '株式会社Advalay'}
📝 タイトル: ${result.title || `${title} - ${serialNo}`}
🔗 アップロード日時: ${result.uploadDate || new Date().toLocaleString('ja-JP')}
📦 S3バックアップ機能は現在無効化されています
🆔 ジョブID: ${result.jobId || 'N/A'}`;

      setUploadResult(successMessage);
      
      // 成功状態に更新
      setUploadState({
        status: 'success',
        progress: 100,
        retryCount: 0,
        maxRetries: 3
      });

    } catch (error) {
      // エラーは既にuploadWithRetryで処理されている
      console.error('Upload failed:', error);
    }
  };

  // 手動リトライ関数
  const handleRetry = () => {
    if (uploadState.status === 'error' && uploadState.error?.retryable) {
      handleUpload();
    }
  };

  // エラー表示を閉じる関数
  const handleDismissError = () => {
    setUploadState(prev => ({
      ...prev,
      status: 'idle',
      error: undefined
    }));
  };

  // =============================================================================
  // UI レンダリング
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Video Uploader
            </h1>
            <div className="text-right">
              {isLoadingAuth ? (
                <div className="text-sm text-gray-500">認証状態を確認中...</div>
              ) : authStatus?.isAuthenticated ? (
                <div>
                  <div className="text-sm text-gray-500">YouTube認証</div>
                  <div className="font-medium text-green-600">認証済み</div>
                  <div className="text-xs text-gray-600">{authStatus.channelInfo?.title}</div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-500">YouTube認証</div>
                  <div className="font-medium text-orange-600">未認証</div>
                  <div className="text-xs text-gray-600">OAuth認証が必要です</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleLogin}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      ログイン
                    </button>
                    <button
                      onClick={refreshAuthStatus}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      更新
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">動画アップロード</h2>
            
            <div className="space-y-6">
              {/* シリアル番号 */}
              <div>
                <label htmlFor="serialNo" className="block text-sm font-medium text-gray-700 mb-2">
                  シリアル番号 *
                </label>
                <input
                  id="serialNo"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="キーホルダーダッシュボードに記載されています"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                />
              </div>

              {/* タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Youtube 動画タイトル *
                </label>
                <input
                  id="title"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="田中　太郎　snapCINEMA（スナップシネマ）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* ファイル選択 */}
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  動画ファイル *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="file"
                    type="file"
                    accept=".mp4"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                    </div>
                    <div className="text-sm text-gray-700">
                      {selectedFile ? selectedFile.name : 'MP4ファイルを選択してください'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">最大200MB、MP4形式のみ</div>
                  </label>
                </div>
              </div>

              {/* アップロードボタン */}
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadState.status === 'uploading' || uploadState.status === 'retrying' || !authStatus?.isAuthenticated}
                className="px-4 py-2 text-white rounded-lg font-medium transition-colors w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploadState.status === 'uploading' ? 'アップロード中...' : 
                 uploadState.status === 'retrying' ? '再試行中...' : 
                 'アップロード開始'}
              </button>
            </div>

            {/* 進捗表示 */}
            <ProgressDisplay uploadState={uploadState} />

            {/* リトライ状態表示 */}
            <RetryDisplay uploadState={uploadState} />

            {/* エラー表示 */}
            <ErrorDisplay 
              uploadState={uploadState} 
              onRetry={handleRetry}
              onDismiss={handleDismissError}
            />

            {/* アップロード結果 */}
            {uploadResult && uploadState.status === 'success' && (
              <div className="mt-6 p-4 rounded-lg bg-green-50 text-green-800">
                <pre className="whitespace-pre-wrap text-sm">{uploadResult}</pre>
              </div>
            )}
          </div>

          {/* 認証状態の注意書き */}
          {!authStatus?.isAuthenticated && (
            <div className="mt-8 p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-900 mb-2">⚠️ YouTube認証が必要です</h3>
              <p className="text-sm text-orange-800">
                YouTubeチャンネルに動画をアップロードするには、OAuth認証を完了する必要があります。
              </p>
              <p className="text-sm text-orange-800 mt-2">
                <strong>Store Token:</strong> {storeToken}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}