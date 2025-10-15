import { useState, useEffect } from 'react';

interface Video {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  size: number;
  duration: number;
  uploadDate: string;
  status: 'active' | 'deleted';
  organizationId: string;
  shopId: string;
  organizationName?: string;
  shopName?: string;
  uploadedBy: string;
}

interface VideoFilters {
  organizationId?: string;
  shopId?: string;
  status?: 'active' | 'deleted';
  search?: string;
}

interface UseAllVideosResult {
  videos: Video[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAllVideos(filters: VideoFilters = {}): UseAllVideosResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // モックデータ
      const mockVideos: Video[] = [
        {
          videoId: 'video-001',
          title: 'テスト動画1',
          description: 'これはテスト動画1の説明です。',
          thumbnailUrl: 'https://via.placeholder.com/150?text=Video1',
          videoUrl: 'https://example.com/video1.mp4',
          size: 1024 * 1024 * 50, // 50MB
          duration: 120, // 2 minutes
          uploadDate: '2023-01-15T10:00:00Z',
          status: 'active',
          organizationId: 'org-agency-0271a85c',
          shopId: 'shop-001',
          organizationName: '株式会社Advalay',
          shopName: '販売店A',
          uploadedBy: 'user-001',
        },
        {
          videoId: 'video-002',
          title: 'テスト動画2',
          description: 'これはテスト動画2の説明です。',
          thumbnailUrl: 'https://via.placeholder.com/150?text=Video2',
          videoUrl: 'https://example.com/video2.mp4',
          size: 1024 * 1024 * 120, // 120MB
          duration: 300, // 5 minutes
          uploadDate: '2023-02-20T11:30:00Z',
          status: 'active',
          organizationId: 'org-agency-0271a85c',
          shopId: 'shop-002',
          organizationName: '株式会社Advalay',
          shopName: '販売店B',
          uploadedBy: 'user-002',
        },
        {
          videoId: 'video-003',
          title: 'テスト動画3',
          description: 'これはテスト動画3の説明です。',
          thumbnailUrl: 'https://via.placeholder.com/150?text=Video3',
          videoUrl: 'https://example.com/video3.mp4',
          size: 1024 * 1024 * 80, // 80MB
          duration: 180, // 3 minutes
          uploadDate: '2023-03-10T14:15:00Z',
          status: 'active',
          organizationId: 'org-agency-96e2ab4c',
          shopId: 'shop-003',
          organizationName: 'テスト代理店',
          shopName: 'テスト販売店',
          uploadedBy: 'user-003',
        },
      ];

      // フィルタリング
      let filteredVideos = mockVideos;

      if (filters.organizationId) {
        filteredVideos = filteredVideos.filter(video => video.organizationId === filters.organizationId);
      }

      if (filters.shopId) {
        filteredVideos = filteredVideos.filter(video => video.shopId === filters.shopId);
      }

      if (filters.status) {
        filteredVideos = filteredVideos.filter(video => video.status === filters.status);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredVideos = filteredVideos.filter(video =>
          video.title.toLowerCase().includes(searchLower) ||
          video.description.toLowerCase().includes(searchLower) ||
          video.organizationName?.toLowerCase().includes(searchLower) ||
          video.shopName?.toLowerCase().includes(searchLower)
        );
      }

      setVideos(filteredVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : '動画一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [filters.organizationId, filters.shopId, filters.status, filters.search]);

  return {
    videos,
    isLoading,
    error,
    refetch: fetchVideos,
  };
}

