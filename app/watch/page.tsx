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
  const containerRef = useRef<HTMLDivElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>(getBrandingConfig());
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // スクロールを無効化し、画面サイズを固定
  useEffect(() => {
    // bodyとhtmlのスクロールを無効化
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.height = '100%';
    document.documentElement.style.width = '100%';

    return () => {
      // クリーンアップ
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.height = '';
      document.documentElement.style.width = '';
    };
  }, []);


  // 全画面表示を開始するヘルパー関数
  const requestFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;

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
      setIsFullscreen(true);
    } catch (err) {
      // 全画面表示が失敗しても再生は続行
      console.log('全画面表示に失敗しました（非対応ブラウザの可能性）:', err);
    }
  };

  // 全画面解除のヘルパー関数
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.log('全画面解除に失敗しました:', err);
    }
  };

  // 再生/一時停止のトグル
  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // 再生時に全画面表示を開始
      await requestFullscreen();
      await video.play();
    }
  };

  // コントロールを自動的に非表示にする
  const resetHideControlsTimeout = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setShowControls(true);

    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // 3秒後に非表示
    }
  };

  // シークバーの変更
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  // 音量の変更
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // ミュート切り替え
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 動画イベントリスナーの設定
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      resetHideControlsTimeout();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleVolumeUpdate = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeUpdate);
    };
  }, []);

  // 全画面状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // マウス移動でコントロールを表示
  const handleMouseMove = () => {
    resetHideControlsTimeout();
  };

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
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      style={{
        backgroundColor: branding.colors.background,
        color: branding.colors.text,
      }}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
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

      {/* 動画プレイヤー（画面幅100%表示） - ネイティブコントロールなし */}
      <video
        ref={videoRef}
        poster={videoData?.thumbnailUrl || undefined}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="absolute inset-0 object-cover w-full h-full"
        onClick={togglePlayPause}
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

      {/* 中央の大きな再生ボタン（一時停止時のみ表示） */}
      {!isPlaying && videoData && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <button
            onClick={togglePlayPause}
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
        </div>
      )}

      {/* カスタムコントロールバー */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      >
        {/* シークバー */}
        <div className="px-4 pt-8 pb-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`,
            }}
          />
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-4">
            {/* 再生/一時停止ボタン */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 時間表示 */}
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 音量コントロール */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
                aria-label={isMuted ? 'ミュート解除' : 'ミュート'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`,
                }}
              />
            </div>

            {/* 全画面切り替えボタン */}
            <button
              onClick={isFullscreen ? exitFullscreen : requestFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label={isFullscreen ? '全画面解除' : '全画面表示'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* カスタムCSS（設定されている場合） */}
      {branding.customStyles && (
        <style dangerouslySetInnerHTML={{ __html: branding.customStyles }} />
      )}

      {/* カスタムコントロール用スタイル */}
      <style>{`
        /* レンジスライダーのスタイリング */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          border: none;
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
// Force rebuild Sat Oct 18 00:17:22 JST 2025
