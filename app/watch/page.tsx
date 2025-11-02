'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { getBrandingConfig, BrandingConfig } from '../../lib/branding-config';

interface VideoDetail {
  videoUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  title?: string;
  organizationId?: string;
}

function WatchContent() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');

  const [videoData, setVideoData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>(getBrandingConfig());

  useEffect(() => {
    if (!videoId) {
      setError('動画IDが指定されていません');
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://rwwiyktk7e.execute-api.ap-northeast-1.amazonaws.com/dev';
        const response = await fetch(`${apiUrl}/videos/${videoId}/detail`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('この動画は削除されました');
          } else {
            setError('動画を読み込めませんでした');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success) {
          setVideoData(data.data);

          // 組織IDがあればブランディング設定を更新
          if (data.data.organizationId) {
            setBranding(getBrandingConfig(data.data.organizationId));
          }

          setLoading(false);
        } else {
          setError('動画を読み込めませんでした');
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error('Error fetching video:', err);
        setError('動画を読み込めませんでした');
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  // スクロールを無効化し、画面サイズを固定
  useEffect(() => {
    // bodyとhtmlのスクロールを無効化
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.height = '100vh';
    document.body.style.width = '100vw';

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.height = '100vh';
    document.documentElement.style.width = '100vw';

    return () => {
      // クリーンアップ
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.height = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.height = '';
      document.documentElement.style.width = '';
    };
  }, []);

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-8 border-white border-t-transparent mb-12"></div>
        <p className="text-4xl md:text-5xl font-bold text-center">
          動画を読み込んでいます...
        </p>
        <p className="text-2xl md:text-3xl text-gray-400 mt-6 text-center">
          しばらくお待ちください
        </p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <div className="text-8xl mb-8">😔</div>
        <p className="text-4xl md:text-5xl font-bold text-center mb-4">
          申し訳ございません
        </p>
        <p className="text-3xl md:text-4xl text-center mb-12 text-gray-300">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-3xl md:text-4xl font-bold px-16 py-8 rounded-2xl transition-all transform hover:scale-105 shadow-2xl"
        >
          もう一度試す
        </button>
      </div>
    );
  }

  // 動画プレイヤー表示（全画面）
  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      style={{
        backgroundColor: branding.colors.background,
        color: branding.colors.text,
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* ロゴ（設定されている場合） */}
      {branding.logo.enabled && branding.logo.imageUrl && (
        <div
          className={`absolute z-20 p-4 ${
            branding.logo.position === 'top-left' ? 'top-0 left-0' :
            branding.logo.position === 'top-center' ? 'top-0 left-1/2 -translate-x-1/2' :
            branding.logo.position === 'top-right' ? 'top-0 right-0' :
            branding.logo.position === 'bottom-left' ? 'bottom-0 left-0' :
            branding.logo.position === 'bottom-center' ? 'bottom-0 left-1/2 -translate-x-1/2' :
            'bottom-0 right-0'
          }`}
        >
          <Image
            src={branding.logo.imageUrl}
            alt={branding.logo.altText}
            width={branding.logo.width}
            height={branding.logo.height}
            className="object-contain"
          />
        </div>
      )}

      {/* ウォーターマーク（設定されている場合） */}
      {branding.watermark.enabled && (
        <div
          className={`absolute z-20 p-4 pointer-events-none ${
            branding.watermark.position === 'top-left' ? 'top-0 left-0' :
            branding.watermark.position === 'top-right' ? 'top-0 right-0' :
            branding.watermark.position === 'bottom-left' ? 'bottom-0 left-0' :
            'bottom-0 right-0'
          }`}
          style={{ opacity: branding.watermark.opacity }}
        >
          <p className="text-sm" style={{ color: branding.colors.text }}>
            {branding.watermark.text}
          </p>
        </div>
      )}

      {/* 動画タイトル（左上） - デプロイ確認用に赤背景に変更 */}
      {videoData?.title && (
        <div className="absolute top-4 left-4 z-20 bg-red-600 rounded-lg px-4 py-2 shadow-lg">
          <h1 className="text-lg md:text-xl font-medium text-white">
            {videoData.title} [デプロイ確認]
          </h1>
        </div>
      )}

      {/* 動画プレイヤー（ネイティブコントロール使用） */}
      <video
        ref={videoRef}
        poster={videoData?.thumbnailUrl || undefined}
        controls
        controlsList="nodownload"
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'cover',
        }}
        onError={(e) => {
          const mediaError = (e as any)?.currentTarget?.error;
          console.error('[VideoPlaybackError]', mediaError);
        }}
      >
        {videoData?.videoUrl && (
          <source src={videoData.videoUrl} type="video/mp4" />
        )}
        <track kind="captions" />
        お使いのブラウザは動画の再生に対応していません。
      </video>

      {/* カスタムCSS（設定されている場合） */}
      {branding.customStyles && (
        <style dangerouslySetInnerHTML={{ __html: branding.customStyles }} />
      )}

      {/* ネイティブコントロールバーのグラデーションを削除 */}
      <style>{`
        video::-webkit-media-controls-enclosure {
          background: transparent !important;
          background-image: none !important;
        }
        video::-webkit-media-controls-panel {
          background: transparent !important;
          background-image: none !important;
        }
        video::-webkit-media-controls {
          background: transparent !important;
          background-image: none !important;
        }
      `}</style>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-8 border-white border-t-transparent mb-12"></div>
        <p className="text-4xl md:text-5xl font-bold text-center">
          読み込み中...
        </p>
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
