import { useState, useCallback } from 'react';
import { apiPost } from '../lib/api-client';

// CRC32計算用のヘルパー関数
async function calculateCRC32(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // CRC32テーブル生成
  const makeCRCTable = () => {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    return crcTable;
  };

  const crcTable = makeCRCTable();
  let crc = 0 ^ (-1);

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }

  const crc32 = (crc ^ (-1)) >>> 0;
  
  // Base64エンコード（4バイトのビッグエンディアン整数として）
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, crc32, false); // ビッグエンディアン
  
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64;
}

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
  description?: string;
  size: number;
}

interface UseUploadResult {
  isUploading: boolean;
  progress: UploadProgress;
  result: UploadResult | null;
  error: string | null;
  upload: (file: File, title: string, description?: string) => Promise<void>;
  reset: () => void;
}

export function useUpload(): UseUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, title: string, description?: string) => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setResult(null);
    setError(null);

    try {
      // Step 1: 署名付きURL取得
      console.log('📤 Step 1: 署名付きURL取得中...');
      console.log('リクエスト内容:', {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        title: title || file.name
      });
      
      const uploadUrlResponse = await apiPost<{
        videoId: string;
        uploadUrl: string;
        expiresIn: number;
      }>('/videos/upload-url', {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        title: title || file.name,
      });

      const { videoId, uploadUrl } = uploadUrlResponse;
      console.log('✅ 署名付きURL取得成功:', { videoId, uploadUrl: uploadUrl.substring(0, 50) + '...' });

      // Step 2: CRC32チェックサム計算
      console.log('Step 2: CRC32チェックサム計算中...');
      const crc32Checksum = await calculateCRC32(file);
      console.log('✅ CRC32チェックサム計算完了:', crc32Checksum);

      // Step 3: S3へ直接アップロード（XMLHttpRequestでプログレストラッキング）
      console.log('Step 3: S3へアップロード中...');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // プログレス更新
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            setProgress({
              loaded: e.loaded,
              total: e.total,
              percentage,
            });
            console.log(`アップロード進捗: ${percentage}%`);
          }
        });

        // アップロード完了
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            console.log('S3アップロード成功');
            resolve();
          } else {
            reject(new Error(`S3アップロード失敗: ${xhr.status} ${xhr.statusText}`));
          }
        });

        // エラーハンドリング
        xhr.addEventListener('error', () => {
          reject(new Error('ネットワークエラーが発生しました'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('アップロードがキャンセルされました'));
        });

        // S3へPUTリクエスト
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-amz-checksum-crc32', crc32Checksum); // CRC32チェックサムヘッダー追加
        xhr.send(file);
      });

      // Step 4: 結果を設定
      console.log('Step 4: アップロード完了');
      const videoUrl = `${window.location.origin}/watch?id=${videoId}`;
      
      setResult({
        videoId,
        videoUrl,
        thumbnailUrl: '', // サムネイルは後で生成される
        title: title || file.name,
        size: file.size,
      });

      console.log('✅ アップロード処理完了:', { videoId, videoUrl });
    } catch (err: any) {
      console.error('❌ アップロードエラー詳細:', {
        error: err,
        message: err.message,
        status: err.statusCode,
        code: err.code
      });
      
      // エラーメッセージの詳細化
      let errorMessage = 'アップロードに失敗しました';
      
      if (err.statusCode === 403) {
        errorMessage = '❌ アクセスが拒否されました。権限を確認してください。';
      } else if (err.statusCode === 401) {
        errorMessage = '❌ 認証に失敗しました。ログインし直してください。';
      } else if (err.message?.includes('CORS')) {
        errorMessage = '❌ CORSエラーが発生しました。ブラウザをリフレッシュしてください。';
      } else if (err.message?.includes('ネットワーク')) {
        errorMessage = '❌ ネットワークに接続できません。時間をおいて再試行してください。';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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