import { ErrorType, DetailedError, ErrorMessageConfig, RetryConfig } from '@/types/error';

// エラーメッセージの設定
const ERROR_MESSAGES: Record<ErrorType, ErrorMessageConfig> = {
  [ErrorType.NETWORK_ERROR]: {
    userMessage: "ネットワーク接続に問題があります",
    suggestedAction: "インターネット接続を確認して、しばらく待ってから再試行してください",
    retryable: true
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    userMessage: "認証に失敗しました",
    suggestedAction: "YouTube認証を再実行してください",
    retryable: false
  },
  [ErrorType.FILE_SIZE_ERROR]: {
    userMessage: "ファイルサイズが大きすぎます",
    suggestedAction: "ファイルサイズを200MB以下に圧縮してから再試行してください",
    retryable: false
  },
  [ErrorType.FILE_TYPE_ERROR]: {
    userMessage: "対応していないファイル形式です",
    suggestedAction: "MP4形式のファイルを選択してください",
    retryable: false
  },
  [ErrorType.YOUTUBE_API_ERROR]: {
    userMessage: "YouTubeへのアップロードに失敗しました",
    suggestedAction: "しばらく待ってから再試行してください。問題が続く場合は管理者にお問い合わせください",
    retryable: true
  },
  [ErrorType.VALIDATION_ERROR]: {
    userMessage: "入力内容に問題があります",
    suggestedAction: "すべての項目を正しく入力してください",
    retryable: false
  },
  [ErrorType.SYSTEM_ERROR]: {
    userMessage: "システムエラーが発生しました",
    suggestedAction: "しばらく待ってから再試行してください。問題が続く場合は管理者にお問い合わせください",
    retryable: true
  },
  [ErrorType.TIMEOUT_ERROR]: {
    userMessage: "アップロードがタイムアウトしました",
    suggestedAction: "ネットワーク接続を確認して、ファイルサイズを小さくしてから再試行してください",
    retryable: true
  },
  [ErrorType.RATE_LIMIT_ERROR]: {
    userMessage: "アップロード制限に達しました",
    suggestedAction: "しばらく待ってから再試行してください",
    retryable: true
  }
};

// リトライ設定
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: [1000, 3000, 5000], // 1秒、3秒、5秒
  retryableErrors: [
    ErrorType.NETWORK_ERROR,
    ErrorType.YOUTUBE_API_ERROR,
    ErrorType.SYSTEM_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR
  ]
};

// エラーを分析してタイプを決定
export function analyzeError(error: any): ErrorType {
  if (!error) return ErrorType.SYSTEM_ERROR;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status || '';

  // ネットワークエラー
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
      errorMessage.includes('connection') || errorCode === 'NETWORK_ERROR') {
    return ErrorType.NETWORK_ERROR;
  }

  // 認証エラー
  if (errorMessage.includes('auth') || errorMessage.includes('token') || 
      errorCode === '401' || errorCode === 'UNAUTHORIZED') {
    return ErrorType.AUTHENTICATION_ERROR;
  }

  // ファイルサイズエラー
  if (errorMessage.includes('too large') || errorMessage.includes('size') || 
      errorCode === '413' || errorCode === 'FILE_TOO_LARGE') {
    return ErrorType.FILE_SIZE_ERROR;
  }

  // ファイルタイプエラー
  if (errorMessage.includes('type') || errorMessage.includes('format') || 
      errorMessage.includes('mp4')) {
    return ErrorType.FILE_TYPE_ERROR;
  }

  // YouTube APIエラー
  if (errorMessage.includes('youtube') || errorMessage.includes('google') || 
      errorCode === 'YOUTUBE_ERROR') {
    return ErrorType.YOUTUBE_API_ERROR;
  }

  // バリデーションエラー
  if (errorMessage.includes('validation') || errorMessage.includes('required') || 
      errorCode === '400' || errorCode === 'VALIDATION_ERROR') {
    return ErrorType.VALIDATION_ERROR;
  }

  // タイムアウトエラー
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return ErrorType.TIMEOUT_ERROR;
  }

  // レート制限エラー
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || 
      errorCode === '429' || errorCode === 'RATE_LIMIT') {
    return ErrorType.RATE_LIMIT_ERROR;
  }

  // デフォルトはシステムエラー
  return ErrorType.SYSTEM_ERROR;
}

// 詳細エラーオブジェクトを作成
export function createDetailedError(
  error: any, 
  type?: ErrorType, 
  code?: string
): DetailedError {
  const errorType = type || analyzeError(error);
  const errorConfig = ERROR_MESSAGES[errorType];
  
  return {
    type: errorType,
    code: code || error.code || error.status || 'UNKNOWN',
    message: error.message || 'Unknown error occurred',
    userMessage: errorConfig.userMessage,
    retryable: errorConfig.retryable,
    suggestedAction: errorConfig.suggestedAction,
    timestamp: new Date(),
    originalError: error
  };
}

// エラーがリトライ可能かチェック
export function isRetryableError(error: DetailedError): boolean {
  return RETRY_CONFIG.retryableErrors.includes(error.type) && error.retryable;
}

// リトライ遅延時間を取得
export function getRetryDelay(retryCount: number): number {
  const delays = RETRY_CONFIG.retryDelay;
  return delays[Math.min(retryCount, delays.length - 1)];
}

// エラーログを送信
export async function logError(error: DetailedError, context: any = {}): Promise<void> {
  try {
    const errorLog = {
      ...error,
      context,
      userAgent: navigator.userAgent,
      timestamp: error.timestamp.toISOString(),
      sessionId: getSessionId(),
      url: window.location.href
    };
    
    // サーバーに送信（実装は後で追加）
    console.log('Error logged:', errorLog);
    
    // 本番環境では実際のエラーログサービスに送信
    // await fetch('/api/v1/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorLog)
    // });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// セッションIDを取得（簡易版）
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}
