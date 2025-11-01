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
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>(getBrandingConfig());
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

          // 自動再生試行（1秒後）
          setTimeout(() => {
            videoRef.current?.play().catch(() => {
              // 自動再生失敗(iOS Safariなど) - ユーザー操作が必要
            });
          }, 1000);
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

  // モバイルデバイスの判定
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 動画の寸法を検出
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        setVideoDimensions({ width, height });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // すでにメタデータが読み込まれている場合
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoData]);

  // 全画面表示を開始するヘルパー関数
  const requestFullscreen = async (element: HTMLElement) => {
    try {
      // ブラウザ互換性のため、複数のメソッドを試行
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (err) {
      // 全画面表示が失敗しても再生は続行
      console.log('全画面表示に失敗しました（非対応ブラウザの可能性）:', err);
    }
  };

  // 動画の再生状態を監視（モバイルの場合、再生時に全画面表示）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = async () => {
      setIsPlaying(true);
      
      // モバイルデバイスの場合、再生時に全画面表示を開始
      // ただし、既に全画面表示になっている場合はスキップ
      if (isMobile) {
        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );
        
        if (!isFullscreen) {
          await requestFullscreen(video);
        }
      }
    };

    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoData, isMobile]);

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
      className="fixed inset-0 p-0"
      style={{ 
        backgroundColor: branding.colors.background,
        color: branding.colors.text,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
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

      {/* 企業名は非表示（動画タイトルを優先） */}

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

      {/* 動画タイトル（左上） - モダン＆ミニマル */}
      {videoData?.title && (
        <div className="absolute top-4 left-4 z-20 backdrop-blur-md bg-gradient-to-r from-black/60 to-black/40 rounded-lg px-4 py-2 shadow-lg">
          <h1 
            className="text-lg md:text-xl font-medium text-white"
          >
            {videoData.title}
          </h1>
        </div>
      )}

      {/* 動画プレイヤー（画面幅100%表示） */}
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
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          margin: 0,
          padding: 0,
        }}
        onError={(e) => {
          // 端末依存の再生失敗を可視化
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

      {/* 大きな再生/一時停止ボタン（ビデオ上にオーバーレイ） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isPlaying && videoData && (
          <button
            onClick={async () => {
              const video = videoRef.current;
              if (!video) return;

              // 動画を再生（playイベントで全画面表示が自動的に処理される）
              try {
                await video.play();
              } catch (err) {
                console.error('動画の再生に失敗しました:', err);
              }
            }}
            className="pointer-events-auto bg-blue-600/90 hover:bg-blue-700 text-white rounded-full p-12 transition-all transform hover:scale-110 shadow-2xl"
            aria-label="再生"
          >
            <svg
              className="w-24 h-24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* 下部: 追加情報またはフッター（非表示） */}
      {/* 動画の二重線問題を回避するため、フッターは非表示にしました */}

      {/* カスタムCSS（設定されている場合） */}
      {branding.customStyles && (
        <style dangerouslySetInnerHTML={{ __html: branding.customStyles }} />
      )}

      {/* 動画要素のデフォルトスタイルをリセット */}
      <style>{`
        video {
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        video::-webkit-media-controls {
          background: transparent !important;
        }
        video::-webkit-media-controls-enclosure {
          background: transparent !important;
        }
        ${!isPlaying ? `
          video::-webkit-media-controls-overlay-play-button {
            display: none !important;
          }
          video::-webkit-media-controls-play-button {
            display: none !important;
          }
        ` : ''}
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
// Force rebuild Sat Oct 18 00:17:22 JST 2025
