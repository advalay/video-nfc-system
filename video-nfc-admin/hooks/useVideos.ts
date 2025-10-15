import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface Video {
  videoId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  thumbnailUrl?: string;
  publicUrl?: string;
}

export interface UseVideosOptions {
  organizationId?: string;
  shopId?: string;
  limit?: number;
  offset?: number;
}

export interface UseVideosResult {
  videos: Video[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalCount: number;
}

export function useVideos(options: UseVideosOptions = {}): UseVideosResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 一時的にモックデータを使用
      const mockVideos: Video[] = [
        {
          videoId: 'video-001',
          fileName: 'sample-video-1.mp4',
          fileSize: 1024000,
          uploadedAt: '2025-01-15T10:30:00Z',
          status: 'completed',
          thumbnailUrl: '/thumbnails/video-001.jpg',
          publicUrl: '/videos/sample-video-1.mp4'
        },
        {
          videoId: 'video-002',
          fileName: 'sample-video-2.mp4',
          fileSize: 2048000,
          uploadedAt: '2025-01-14T15:45:00Z',
          status: 'completed',
          thumbnailUrl: '/thumbnails/video-002.jpg',
          publicUrl: '/videos/sample-video-2.mp4'
        },
        {
          videoId: 'video-003',
          fileName: 'sample-video-3.mp4',
          fileSize: 512000,
          uploadedAt: '2025-01-13T09:20:00Z',
          status: 'processing'
        }
      ];

      setVideos(mockVideos);
      setTotalCount(mockVideos.length);

    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : '動画一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [options.organizationId, options.shopId]);

  return {
    videos,
    isLoading,
    error,
    refetch: fetchVideos,
    totalCount,
  };
}