// ユーティリティ関数群（重複を排除した単一実装）
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${value} ${sizes[i]}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function formatRelativeTime(date: Date | string | number): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: ja });
  } catch {
    return '';
  }
}

export function getVideoPublicUrl(videoId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return `${base}/videos/${videoId}/public`;
}

export function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

export function formatUploadDateTime(uploadedAt: string | Date): {
  display: string;
  tooltip: string;
  deletableInfo?: string;
  isWarning?: boolean;
} {
  try {
    const uploadDate = typeof uploadedAt === 'string' ? new Date(uploadedAt) : uploadedAt;
    const now = new Date();
    const diffInHours = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60);
    
    // 24時間以内の場合は削除可能
    const isDeletable = diffInHours < 24;
    const isWarning = diffInHours > 20; // 20時間以上経過したら警告
    
    const display = formatRelativeTime(uploadDate);
    const tooltip = uploadDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let deletableInfo: string | undefined;
    if (isDeletable) {
      const remainingHours = Math.max(0, 24 - diffInHours);
      if (remainingHours > 1) {
        deletableInfo = `削除可能まで ${Math.floor(remainingHours)}時間`;
      } else if (remainingHours > 0) {
        const remainingMinutes = Math.floor(remainingHours * 60);
        deletableInfo = `削除可能まで ${remainingMinutes}分`;
      } else {
        deletableInfo = '削除可能期限切れ';
      }
    }
    
    return {
      display,
      tooltip,
      deletableInfo,
      isWarning: isWarning && isDeletable
    };
  } catch (error) {
    return {
      display: '不明',
      tooltip: '日時の取得に失敗しました',
      deletableInfo: undefined,
      isWarning: false
    };
  }
}