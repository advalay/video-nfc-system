// エラータイプの定義
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FILE_SIZE_ERROR = 'FILE_SIZE_ERROR',
  FILE_TYPE_ERROR = 'FILE_TYPE_ERROR',
  YOUTUBE_API_ERROR = 'YOUTUBE_API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

// 詳細エラーインターフェース
export interface DetailedError {
  type: ErrorType;
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestedAction: string;
  timestamp: Date;
  originalError?: any;
}

// アップロード状態
export interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error' | 'retrying';
  progress: number;
  error?: DetailedError;
  retryCount: number;
  maxRetries: number;
  estimatedTimeRemaining?: number;
}

// リトライ設定
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number[];
  retryableErrors: ErrorType[];
}

// エラーメッセージ設定
export interface ErrorMessageConfig {
  userMessage: string;
  suggestedAction: string;
  retryable: boolean;
}
