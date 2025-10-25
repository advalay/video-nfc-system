import { useState, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

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
  size: number;
  duration: number;
}

interface UseUploadResult {
  isUploading: boolean;
  progress: UploadProgress;
  result: UploadResult | null;
  error: string | null;
  upload: (file: File, title: string) => Promise<void>;
  reset: () => void;
}

export function useUpload(): UseUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, title: string) => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setResult(null);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      if (!API_URL) {
        throw new Error('API URLが設定されていません');
      }

      // Step 1: 署名付きURLを取得
      console.log('Step 1: 署名付きURL取得中...');
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('認証トークンが取得できません');
      }

      const requestBody = {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        title: title || file.name,
      };

      console.log('リクエスト内容:', requestBody);

      const uploadUrlResponse = await fetch(`${API_URL}/videos/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!uploadUrlResponse.ok) {
        const errorText = await uploadUrlResponse.text();
        throw new Error(`署名付きURL取得失敗: ${uploadUrlResponse.status} ${errorText}`);
      }

      const uploadUrlData = await uploadUrlResponse.json();

      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.error?.message || '署名付きURLの取得に失敗しました');
      }

      const { uploadUrl, videoId, s3Key } = uploadUrlData.data;
      console.log('✔ 署名付きURL取得成功:', { videoId, uploadUrl: uploadUrl.substring(0, 100) + '...' });

      // Step 2: S3に直接アップロード
      console.log('Step 2: S3へアップロード中...');
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // アップロード進捗の監視
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            console.log(`アップロード進捗: ${percentage}%`);
            setProgress({
              loaded: e.loaded,
              total: e.total,
              percentage,
            });
          }
        });

        // アップロード完了
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            console.log('✔ S3アップロード成功');
            resolve();
          } else {
            console.error('●×× アップロードエラー:', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText,
            });
            reject(new Error(`S3 アップロード失敗: ${xhr.status} ${xhr.statusText}`));
          }
        });

        // エラーハンドリング
        xhr.addEventListener('error', () => {
          console.error('●×× ネットワークエラー');
          reject(new Error('ネットワークエラーが発生しました'));
        });

        xhr.addEventListener('abort', () => {
          console.error('●×× アップロード中止');
          reject(new Error('アップロードが中止されました'));
        });

        // S3への PUT リクエスト
        xhr.open('PUT', uploadUrl);
        
        // 必須ヘッダーを設定
        xhr.setRequestHeader('Content-Type', file.type);
        // 注: x-amz-server-side-encryption ヘッダーは削除
        // S3バケットのデフォルト暗号化設定（S3_MANAGED）に任せる
        // Pre-signed URLに含まれていないパラメータを送信すると、403エラーになる
        
        // ファイルを送信
        xhr.send(file);
      });

      // Step 3: アップロード完了
      console.log('✔ アップロード完了');
      
      const uploadResult: UploadResult = {
        videoId,
        videoUrl: `https://example.com/videos/${videoId}`, // 実際のCloudFront URLに置き換え
        thumbnailUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(title)}`,
        title,
        size: file.size,
        duration: 0, // 実際の動画長は別途取得が必要
      };

      setResult(uploadResult);
      
    } catch (err: any) {
      console.error('●×× アップロードエラー詳細:', err);
      const errorMessage = err.message || 'アップロードに失敗しました';
      setError(errorMessage);
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
