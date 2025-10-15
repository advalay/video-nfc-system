import { useState, useCallback } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  size: number;
  duration: number;
}

interface UseUploadResult {
  isUploading: boolean;
  progress: UploadProgress;
  result: UploadResult | null;
  error: string | null;
  upload: (file: File, title: string, description: string) => Promise<void>;
  reset: () => void;
}

export function useUpload(): UseUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, title: string, description: string) => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setResult(null);
    setError(null);

    try {
      // モックのアップロード処理
      const totalSize = file.size;
      const chunkSize = Math.ceil(totalSize / 100);
      
      for (let i = 0; i <= 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // モックの遅延
        
        const loaded = Math.min(i * chunkSize, totalSize);
        const percentage = Math.round((loaded / totalSize) * 100);
        
        setProgress({ loaded, total: totalSize, percentage });
      }

      // モックの結果
      const mockResult: UploadResult = {
        videoId: `video-${Date.now()}`,
        videoUrl: `https://example.com/videos/video-${Date.now()}.mp4`,
        thumbnailUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(title)}`,
        title,
        description,
        size: file.size,
        duration: Math.floor(Math.random() * 300) + 60, // 1-6分のランダムな長さ
      };

      setResult(mockResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setResult(null);
    setError(null);
  }, []);

  return {
    isUploading,
    progress,
    result,
    error,
    upload,
    reset,
  };
}