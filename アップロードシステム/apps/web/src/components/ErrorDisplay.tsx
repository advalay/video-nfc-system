'use client';

import React from 'react';
import { DetailedError, UploadState } from '@/types/error';

interface ErrorDisplayProps {
  uploadState: UploadState;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ uploadState, onRetry, onDismiss }: ErrorDisplayProps) {
  const { error, status, retryCount, maxRetries } = uploadState;

  if (status !== 'error' || !error) {
    return null;
  }

  const canRetry = error.retryable && retryCount < maxRetries;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            ❌ アップロードに失敗しました
          </h3>
          
          <div className="mt-2 text-sm text-red-700">
            <div className="mb-2">
              <strong>エラー詳細:</strong>
              <p className="mt-1">{error.userMessage}</p>
            </div>
            
            <div className="mb-2">
              <strong>対処法:</strong>
              <p className="mt-1">{error.suggestedAction}</p>
            </div>

            {retryCount > 0 && (
              <div className="mb-2">
                <strong>リトライ情報:</strong>
                <p className="mt-1">
                  自動リトライ {retryCount}/{maxRetries} 回実行しました
                </p>
              </div>
            )}

            <div className="text-xs text-red-600 mt-2">
              <p>エラーコード: {error.code}</p>
              <p>発生時刻: {error.timestamp.toLocaleString('ja-JP')}</p>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🔄 手動で再試行
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// リトライ状態表示コンポーネント
interface RetryDisplayProps {
  uploadState: UploadState;
}

export function RetryDisplay({ uploadState }: RetryDisplayProps) {
  const { status, retryCount, maxRetries, estimatedTimeRemaining } = uploadState;

  if (status !== 'retrying') {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="animate-spin h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            🔄 自動再試行中...
          </h3>
          <div className="mt-1 text-sm text-yellow-700">
            <p>リトライ {retryCount + 1}/{maxRetries} 回目</p>
            {estimatedTimeRemaining && (
              <p>約 {estimatedTimeRemaining} 秒後に再試行します</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 進捗表示コンポーネント
interface ProgressDisplayProps {
  uploadState: UploadState;
}

export function ProgressDisplay({ uploadState }: ProgressDisplayProps) {
  const { status, progress } = uploadState;

  if (status !== 'uploading') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            📤 アップロード中...
          </h3>
          <div className="mt-2">
            <div className="bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-700 mt-1">{progress}% 完了</p>
          </div>
        </div>
      </div>
    </div>
  );
}
