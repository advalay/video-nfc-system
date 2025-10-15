'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUpload } from '../../hooks/useUpload';
import { formatFileSize, copyToClipboard } from '../../lib/utils';
import { Upload, CheckCircle, ArrowLeft, X, Download, Copy, QrCode } from 'lucide-react';
import { QRModal } from '../../components/QRModal';
import { Layout } from '../../components/Layout';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { configureAmplify } from '../../lib/amplify-config';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const router = useRouter();
  const { upload, isUploading, progress, result, error, reset } = useUpload();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);


  const validateFile = (file: File): boolean => {
    // MP4チェック
    if (!file.type.startsWith('video/') || !file.name.toLowerCase().endsWith('.mp4')) {
      toast.error('MP4形式の動画ファイルのみアップロード可能です');
      return false;
    }

    // サイズチェック (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('ファイルサイズは50MB以下にしてください');
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        // タイトルは自動入力しない
        setTitle('');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        // タイトルは自動入力しない
        setTitle('');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    configureAmplify();
    await upload(selectedFile, title || undefined, description || undefined);
  };

  const handleCopyUrl = async () => {
    const url = result?.publicUrl || result?.url;
    if (url) {
      const success = await copyToClipboard(url);
      if (success) {
        toast.success('URLをコピーしました！');
      } else {
        toast.error('コピーに失敗しました');
      }
    } else {
      toast.error('URLが取得できていません');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    reset();
  };


  return (
    <ProtectedRoute>
      <Layout>
      {/* ページヘッダー */}
      <div className="flex items-center space-x-4 mb-8">
        {/* 戻るボタン */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          title="ダッシュボードに戻る"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">ダッシュボード</span>
        </button>
        
        {/* パンくずリスト */}
        <span className="text-lg text-gray-400">/</span>
        <span className="text-xl font-bold text-gray-900">動画アップロード</span>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto">
        {!result ? (
          // アップロード前・中
          <div className="space-y-8">
            {/* ドラッグ&ドロップエリア */}
            {!isUploading && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-16 h-16 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        ファイルが選択されました
                      </h3>
                      <p className="text-gray-600 mt-2">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>ファイルを変更</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Upload className="w-16 h-16 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        動画ファイルをドラッグ&ドロップ
                      </h3>
                      <p className="text-gray-600 mt-2">
                        または
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          ファイルを選択
                        </button>
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>対応形式: MP4</p>
                      <p>最大サイズ: 50MB</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ファイル情報入力フォーム */}
            {selectedFile && !isUploading && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  動画情報
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                      placeholder="動画のタイトルを入力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                      placeholder="動画の説明を入力（任意）"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* プログレスバー */}
            {isUploading && (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      アップロード中...
                    </h3>
                    <p className="text-gray-600">{selectedFile?.name}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {progress.percentage}% 完了
                  </p>
                </div>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <X className="w-5 h-5 text-red-500" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            {selectedFile && !isUploading && (
              <div className="flex space-x-4">
                <button
                  onClick={handleUpload}
                  disabled={!title.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>アップロード開始</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        ) : (
          // アップロード完了
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    アップロード完了！
                  </h2>
                  <p className="text-gray-600">
                    動画が正常にアップロードされました
                  </p>
                </div>
              </div>
            </div>

            {/* 動画情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                アップロードされた動画
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">タイトル:</span>
                  <span className="font-medium text-gray-900">{title || result.title || selectedFile?.name || 'タイトルなし'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ファイル名:</span>
                  <span className="font-medium text-gray-900">{result.fileName || selectedFile?.name || 'ファイル名なし'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">サイズ:</span>
                  <span className="font-medium text-gray-900">{formatFileSize(result.fileSize || selectedFile?.size)}</span>
                </div>
                {(description || result.description) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">説明:</span>
                    <span className="font-medium text-gray-900">{description || result.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 公開URL */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                公開URL
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={result.publicUrl || result.url || 'URLを取得中...'}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>コピー</span>
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowQRModal(true)}
                    disabled={!result.publicUrl && !result.url}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRコード表示</span>
                  </button>
                  <button
                    onClick={() => window.open(result.publicUrl || result.url, '_blank')}
                    disabled={!result.publicUrl && !result.url}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>動画を開く</span>
                  </button>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/videos')}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>動画一覧に戻る</span>
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                別の動画をアップロード
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QRコードモーダル */}
      {showQRModal && result && (
        <QRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          url={result.publicUrl || result.url || ''}
          title={title || result.title || selectedFile?.name || '動画QRコード'}
        />
      )}
      </Layout>
    </ProtectedRoute>
  );
}
