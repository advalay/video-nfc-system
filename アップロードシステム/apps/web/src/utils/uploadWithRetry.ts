import { DetailedError, UploadState, RETRY_CONFIG, createDetailedError, isRetryableError, getRetryDelay, logError } from './errorHandler';

// アップロード関数の型定義
export type UploadFunction = (file: File, title: string, serialNo: string, storeToken: string) => Promise<any>;

// リトライ付きアップロード関数
export async function uploadWithRetry(
  uploadFn: UploadFunction,
  file: File,
  title: string,
  serialNo: string,
  storeToken: string,
  onProgress?: (state: UploadState) => void,
  retryCount: number = 0
): Promise<any> {
  
  // 初期状態を設定
  const initialState: UploadState = {
    status: retryCount > 0 ? 'retrying' : 'uploading',
    progress: 0,
    retryCount,
    maxRetries: RETRY_CONFIG.maxRetries
  };
  
  if (onProgress) {
    onProgress(initialState);
  }

  try {
    // 進捗表示のためのフェッチ関数をラップ
    const uploadWithProgress = async () => {
      const response = await fetch('http://localhost:4000/api/v1/public/upload-to-youtube', {
        method: 'POST',
        headers: {
          'X-Store-Token': storeToken,
        },
        body: createFormData(file, title, serialNo),
      });

      // レスポンスの処理
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).code = response.status;
        throw error;
      }

      return await response.json();
    };

    // アップロード実行
    const result = await uploadWithProgress();
    
    // 成功時の状態更新
    const successState: UploadState = {
      status: 'success',
      progress: 100,
      retryCount,
      maxRetries: RETRY_CONFIG.maxRetries
    };
    
    if (onProgress) {
      onProgress(successState);
    }

    return result;

  } catch (error) {
    const detailedError = createDetailedError(error);
    
    // エラーログを記録
    await logError(detailedError, {
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      uploadParams: { title, serialNo, storeToken },
      retryCount
    });

    // リトライ可能かチェック
    if (retryCount < RETRY_CONFIG.maxRetries && isRetryableError(detailedError)) {
      const delay = getRetryDelay(retryCount);
      
      // リトライ待機状態を表示
      const retryState: UploadState = {
        status: 'retrying',
        progress: 0,
        error: detailedError,
        retryCount: retryCount + 1,
        maxRetries: RETRY_CONFIG.maxRetries,
        estimatedTimeRemaining: delay / 1000
      };
      
      if (onProgress) {
        onProgress(retryState);
      }

      // 遅延後にリトライ
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return uploadWithRetry(
        uploadFn,
        file,
        title,
        serialNo,
        storeToken,
        onProgress,
        retryCount + 1
      );
    }

    // リトライ不可能または最大リトライ回数に達した場合
    const errorState: UploadState = {
      status: 'error',
      progress: 0,
      error: detailedError,
      retryCount,
      maxRetries: RETRY_CONFIG.maxRetries
    };
    
    if (onProgress) {
      onProgress(errorState);
    }

    throw detailedError;
  }
}

// FormDataを作成するヘルパー関数
function createFormData(file: File, title: string, serialNo: string): FormData {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('serialNo', serialNo);
  formData.append('video', file);
  return formData;
}

// ファイルバリデーション
export function validateFile(file: File): { valid: boolean; error?: DetailedError } {
  // ファイルサイズチェック（200MB）
  const maxSize = 200 * 1024 * 1024; // 200MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: createDetailedError(
        new Error(`File size ${file.size} exceeds maximum allowed size ${maxSize}`),
        'FILE_SIZE_ERROR' as any,
        'FILE_TOO_LARGE'
      )
    };
  }

  // ファイルタイプチェック
  const allowedTypes = ['video/mp4', 'video/quicktime'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: createDetailedError(
        new Error(`File type ${file.type} is not supported`),
        'FILE_TYPE_ERROR' as any,
        'INVALID_FILE_TYPE'
      )
    };
  }

  return { valid: true };
}

// 入力バリデーション
export function validateInputs(title: string, serialNo: string): { valid: boolean; error?: DetailedError } {
  if (!title || title.trim().length === 0) {
    return {
      valid: false,
      error: createDetailedError(
        new Error('Title is required'),
        'VALIDATION_ERROR' as any,
        'MISSING_TITLE'
      )
    };
  }

  if (!serialNo || serialNo.trim().length === 0) {
    return {
      valid: false,
      error: createDetailedError(
        new Error('Serial number is required'),
        'VALIDATION_ERROR' as any,
        'MISSING_SERIAL_NO'
      )
    };
  }

  return { valid: true };
}
