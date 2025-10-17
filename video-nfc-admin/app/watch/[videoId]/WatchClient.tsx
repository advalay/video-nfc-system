'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { getBrandingConfig, BrandingConfig } from '../../../lib/branding-config';

interface VideoDetail {
  videoUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  title?: string;
  organizationId?: string;
}

export default function WatchClient({ videoId }: { videoId: string }) {
  const [videoData, setVideoData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>(getBrandingConfig());

  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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

          if (data.data.organizationId) {
            setBranding(getBrandingConfig(data.data.organizationId));
          }

          setLoading(false);

          setTimeout(() => {
            videoRef.current?.play().catch(() => {
              console.log('Auto-play failed - user interaction required');
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoData]);

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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-0"
      style={{
        backgroundColor: branding.colors.background,
        color: branding.colors.text,
      }}
    >
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

      {branding.companyName.enabled && (
        <div
          className={`absolute z-20 p-4 ${
            branding.companyName.position === 'top-left' ? 'top-0 left-0' :
            branding.companyName.position === 'top-center' ? 'top-0 left-1/2 -translate-x-1/2' :
            branding.companyName.position === 'top-right' ? 'top-0 right-0' :
            branding.companyName.position === 'bottom-left' ? 'bottom-0 left-0' :
            branding.companyName.position === 'bottom-center' ? 'bottom-0 left-1/2 -translate-x-1/2' :
            'bottom-0 right-0'
          }`}
        >
          <p
            className={`font-bold text-${branding.companyName.fontSize}`}
            style={{ color: branding.colors.text }}
          >
            {branding.companyName.text}
          </p>
        </div>
      )}

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

      {videoData?.title && (
        <div className="absolute top-4 left-4 z-20 bg-black/60 rounded-lg px-3 py-2">
          <h1
            className="text-sm font-medium"
            style={{ color: branding.colors.text }}
          >
            {videoData.title}
          </h1>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoData?.videoUrl}
          poster={videoData?.thumbnailUrl || undefined}
          controls
          controlsList="nodownload"
          playsInline
          preload="auto"
          className="w-full h-auto max-h-screen shadow-2xl"
          style={{
            maxHeight: 'calc(100vh - 2rem)',
          }}
        >
          <track kind="captions" />
          お使いのブラウザは動画の再生に対応していません。
        </video>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isPlaying && videoData && (
          <button
            onClick={() => videoRef.current?.play()}
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

      <div className="w-full bg-gradient-to-t from-black/80 to-transparent py-6 px-8 absolute bottom-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {branding.footer.enabled ? (
            <div className="text-center w-full">
              <p className="text-lg md:text-xl mb-2" style={{ color: branding.colors.text }}>
                {branding.footer.text}
              </p>
              {branding.footer.link && (
                <a
                  href={branding.footer.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base md:text-lg hover:underline"
                  style={{ color: branding.colors.primary }}
                >
                  {branding.footer.link.text}
                </a>
              )}
            </div>
          ) : (
            <p className="text-white/80 text-xl md:text-2xl">
              {videoData?.fileName}
            </p>
          )}
        </div>
      </div>

      {branding.customStyles && (
        <style dangerouslySetInnerHTML={{ __html: branding.customStyles }} />
      )}
    </div>
  );
}
