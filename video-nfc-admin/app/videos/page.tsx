'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Layout } from '../../components/Layout';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { formatFileSize, formatUploadDateTime } from '../../lib/utils';
import { Copy, QrCode, Trash2, Plus, Search, Upload, Video, HardDrive } from 'lucide-react';
import { QRModal } from '../../components/QRModal';

// モック動画データを生成する関数
function getMockVideos() {
  return [
    {
      videoId: 'video-001',
      title: 'サンプル動画1',
      description: 'これはサンプル動画です',
      uploadDate: '2024-10-14T10:00:00Z',
      fileSize: 25 * 1024 * 1024, // 25MB
      status: 'active',
      organizationId: 'org-001',
      shopId: 'shop-001',
      url: 'https://example.com/video1.mp4'
    },
    {
      videoId: 'video-002',
      title: 'サンプル動画2',
      description: '2つ目のサンプル動画です',
      uploadDate: '2024-10-13T15:30:00Z',
      fileSize: 32 * 1024 * 1024, // 32MB
      status: 'active',
      organizationId: 'org-001',
      shopId: 'shop-002',
      url: 'https://example.com/video2.mp4'
    },
    {
      videoId: 'video-003',
      title: 'サンプル動画3',
      description: '3つ目のサンプル動画です',
      uploadDate: '2024-10-12T09:15:00Z',
      fileSize: 18 * 1024 * 1024, // 18MB
      status: 'active',
      organizationId: 'org-002',
      shopId: 'shop-004',
      url: 'https://example.com/video3.mp4'
    },
    {
      videoId: 'video-004',
      title: 'サンプル動画4',
      description: '4つ目のサンプル動画です',
      uploadDate: '2024-10-11T14:45:00Z',
      fileSize: 45 * 1024 * 1024, // 45MB
      status: 'active',
      organizationId: 'org-002',
      shopId: 'shop-005',
      url: 'https://example.com/video4.mp4'
    },
    {
      videoId: 'video-005',
      title: 'サンプル動画5',
      description: '5つ目のサンプル動画です',
      uploadDate: '2024-10-10T11:20:00Z',
      fileSize: 28 * 1024 * 1024, // 28MB
      status: 'active',
      organizationId: 'org-003',
      shopId: 'shop-007',
      url: 'https://example.com/video5.mp4'
    }
  ];
}

export default function VideosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrVideo, setQrVideo] = useState<{ id: string; url: string } | null>(null);

  // 販売店管理者かどうかを判定
  const isShopAdmin = user?.groups?.includes('shop-admin');

         useEffect(() => {
           const fetchVideos = async () => {
             try {
               setIsLoading(true);
               setError(null);
               
               // API呼び出し（開発環境でも実際のAPIを使用）
               const { apiGet } = await import('../../lib/api-client');
               
               // 販売店管理者の場合は自分の販売店の動画のみを取得
               const endpoint = isShopAdmin ? `/videos?shopId=${user?.shopId}` : '/videos';
               const response = await apiGet<{videos: any[], totalCount: number}>(endpoint);
               setVideos(response.videos || []);
             } catch (err: any) {
               console.error('Error fetching videos:', err);
               setError(err.message || '動画一覧の取得に失敗しました。しばらく時間をおいて再度お試しください。');
             } finally {
               setIsLoading(false);
             }
           };

           fetchVideos();
         }, [isShopAdmin, user?.shopId]);

  // 削除可能かどうかを判定する関数
  const canDelete = (uploadDate: string): boolean => {
    if (!uploadDate) return false;
    
    const uploadTime = new Date(uploadDate).getTime();
    const now = Date.now();
    const hoursPassed = (now - uploadTime) / (1000 * 60 * 60);
    
    return hoursPassed < 48; // 48時間以内のみ削除可能
  };

  const handleCopyUrl = async (videoId: string) => {
    const url = `${window.location.origin}/videos/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('URLをコピーしました');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleOpenQR = (videoId: string) => {
    const url = `${window.location.origin}/videos/${videoId}`;
    setQrVideo({ id: videoId, url });
    setQrOpen(true);
  };

  const handleDelete = async (videoId: string, uploadDate: string) => {
    if (!canDelete(uploadDate)) {
      alert('動画は48時間経過後は削除できません');
      return;
    }

    if (!confirm('この動画を削除してもよろしいですか？')) {
      return;
    }

    try {
      const { apiDelete } = await import('../../lib/api-client');
      await apiDelete(`/videos/${videoId}`);
      
      // 動画一覧から削除
      setVideos(videos.filter(v => v.videoId !== videoId));
      alert('動画を削除しました');
    } catch (err: any) {
      console.error('Delete error:', err);
      
      if (err.error?.code === 'DELETE_NOT_ALLOWED') {
        alert('動画は48時間経過後は削除できません');
      } else {
        alert(err.message || '動画の削除に失敗しました');
      }
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin']}>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-500">動画一覧を読み込み中...</div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin']}>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-4">⚠️ エラーが発生しました</div>
              <div className="text-gray-600 mb-4">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['system-admin', 'organization-admin', 'shop-admin']}>
      <Layout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isShopAdmin ? 'マイ動画一覧' : '動画一覧'}
            </h1>
            <p className="text-gray-600">
              {isShopAdmin ? 'あなたの販売店の動画を管理します' : 'アップロードされた動画を管理します'}
            </p>
          </div>
          <button
            onClick={() => router.push('/upload')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>動画をアップロード</span>
          </button>
        </div>

        {/* 動画一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">動画一覧</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="動画を検索..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {videos.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isShopAdmin ? '動画が登録されていません' : '動画が登録されていません'}
              </h3>
              <p className="text-gray-600 mb-4">
                {isShopAdmin ? 'あなたの販売店の動画をアップロードしてください。' : '新しい動画をアップロードしてください。'}
              </p>
              <button
                onClick={() => router.push('/upload')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                動画をアップロード
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      動画名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      サイズ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アップロード日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      組織・店舗
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {videos.map((video) => (
                    <tr key={video.videoId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Video className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {video.fileName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {video.videoId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(video.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const formatted = formatUploadDateTime(video.uploadedAt);
                          return (
                            <div className="flex flex-col" title={formatted.tooltip}>
                              <span>{formatted.display}</span>
                              {formatted.deletableInfo && (
                                <span className={`text-xs ${formatted.isWarning ? 'text-orange-600' : 'text-green-600'}`}>
                                  {formatted.deletableInfo}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          video.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {video.status === 'completed' ? '完了' : '処理中'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{video.organizationName}</div>
                          <div className="text-gray-500">{video.shopName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleCopyUrl(video.videoId)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="URLをコピー"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenQR(video.videoId)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="QRコード"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {canDelete(video.uploadDate || video.uploadedAt) ? (
                            <button
                              onClick={() => handleDelete(video.videoId, video.uploadDate || video.uploadedAt)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="text-gray-300 p-1 cursor-not-allowed"
                              title="48時間経過のため削除不可"
                            >
                              <Trash2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </Layout>
      {qrVideo && (
        <QRModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          videoId={qrVideo.id}
          videoUrl={qrVideo.url}
        />
      )}
    </ProtectedRoute>
  );
}