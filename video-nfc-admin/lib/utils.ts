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

/**
 * アップロード日時を表示用にフォーマット
 * - 48時間以内: 相対時刻 + 削除可能残り時間
 * - 48時間超: 絶対日付（YYYY年MM月DD日）
 */
export function formatUploadDateTime(uploadedAt: string | Date): {
  display: string;
  tooltip: string;
  deletableInfo?: string;
  isWarning?: boolean;
} {
  try {
    const d = typeof uploadedAt === 'string' ? new Date(uploadedAt) : uploadedAt;
    const now = Date.now();
    const uploadTime = d.getTime();
    const hoursPassed = (now - uploadTime) / (1000 * 60 * 60);
    const hoursLeft = 48 - hoursPassed;

    // ツールチップ用の絶対日時（時刻付き）
    const tooltip = d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (hoursPassed < 48) {
      // 48時間以内: 相対時刻 + 削除可能残り時間
      const relativeTime = formatDistanceToNow(d, { addSuffix: true, locale: ja });
      const hoursInt = Math.floor(hoursLeft);
      const minutesInt = Math.floor((hoursLeft - hoursInt) * 60);
      const deletableInfo = `削除可: 残り${hoursInt}時間${minutesInt}分`;
      const isWarning = hoursLeft < 6; // 6時間切ったら警告

      return {
        display: relativeTime,
        tooltip,
        deletableInfo,
        isWarning,
      };
    } else {
      // 48時間超: 絶対日付のみ（時刻なし）
      const absoluteDate = d.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        display: absoluteDate,
        tooltip,
      };
    }
  } catch {
    return { display: '', tooltip: '' };
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