import { useState } from 'react';
import { Copy, ExternalLink, X, RefreshCw } from 'lucide-react';
import { OrganizationAdmin } from '../types/shared';
import { resetOrganizationPassword } from '../lib/api-client';

interface OrganizationAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: OrganizationAdmin | null;
  organizationId: string;
}

export default function OrganizationAdminModal({
  isOpen,
  onClose,
  admin,
  organizationId,
}: OrganizationAdminModalProps) {
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen || !admin) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(admin.email);
      alert('メールアドレスをコピーしました');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(admin.loginUrl);
      alert('ログインURLをコピーしました');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`${admin.organizationName} の組織管理者のパスワードをリセットしますか？\n\nリセットメールが ${admin.email} に送信されます。`)) {
      return;
    }

    setIsResetting(true);
    try {
      await resetOrganizationPassword(organizationId);
      alert(`パスワードリセットメールを ${admin.email} に送信しました`);
    } catch (error: any) {
      console.error('Password reset error:', error);
      alert(`パスワードリセットに失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">組織管理者情報</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 組織名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              組織名
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {admin.organizationName}
            </div>
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス（ログインID）
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm">
                {admin.email}
              </div>
              <button
                onClick={handleCopyEmail}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="コピー"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ログインURL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ログインURL
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm truncate">
                {admin.loginUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="コピー"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={admin.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 作成日時 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作成日時
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {formatDate(admin.createdAt)}
            </div>
          </div>

          {/* パスワードリセット */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleResetPassword}
              disabled={isResetting}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'リセット中...' : 'パスワードリセット'}</span>
            </button>
            <p className="text-xs text-gray-500 mt-2">
              ※ パスワードリセットメールが管理者のメールアドレスに送信されます
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

