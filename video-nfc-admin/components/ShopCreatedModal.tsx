'use client';

import { useState } from 'react';
import { X, CheckCircle, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ShopCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopInfo: {
    shopId: string;
    shopName: string;
    email: string;
    tempPassword?: string;
    loginUrl: string;
    isExistingUser?: boolean;
  } | null;
}

export default function ShopCreatedModal({ 
  isOpen, 
  onClose, 
  shopInfo 
}: ShopCreatedModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCredentials = async () => {
    if (!shopInfo) return;

    const text = shopInfo.tempPassword
      ? `
販売店名: ${shopInfo.shopName}
ログインURL: ${shopInfo.loginUrl}
メールアドレス: ${shopInfo.email}
パスワード: ${shopInfo.tempPassword}

初回ログイン後、パスワードを変更してください。
    `.trim()
      : `
販売店名: ${shopInfo.shopName}
ログインURL: ${shopInfo.loginUrl}
メールアドレス: ${shopInfo.email}

※ 既存のアカウントに販売店が追加されました。
既存のパスワードでログインしてください。
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  const handleCopyPassword = async () => {
    if (!shopInfo || !shopInfo.tempPassword) return;
    
    try {
      await navigator.clipboard.writeText(shopInfo.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('パスワードのコピーに失敗しました:', error);
    }
  };

  if (!isOpen || !shopInfo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">販売店が作成されました</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 成功メッセージ */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {shopInfo.shopName} が正常に作成されました
              </span>
            </div>
          </div>

          {/* ログイン情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">ログイン情報</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* 販売店名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  販売店名
                </label>
                <div className="text-sm text-gray-900 font-medium">
                  {shopInfo.shopName}
                </div>
              </div>

              {/* ログインURL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ログインURL
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                    {shopInfo.loginUrl}
                  </div>
                  <a
                    href={shopInfo.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="新しいタブで開く"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <div className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                  {shopInfo.email}
                </div>
              </div>

              {/* パスワード */}
              {shopInfo.tempPassword ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    初期パスワード
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                      {showPassword ? shopInfo.tempPassword : '••••••••'}
                    </div>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleCopyPassword}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="パスワードをコピー"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-blue-800 text-sm">
                    <p className="font-medium mb-1">既存アカウントを使用</p>
                    <p className="text-xs">
                      このメールアドレスは既に登録されています。既存のパスワードでログインしてください。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 警告メッセージ */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="text-yellow-800 text-sm">
                <p className="font-medium mb-1">重要な注意事項</p>
                <ul className="space-y-1 text-xs">
                  <li>• このログイン情報は再表示できません</li>
                  <li>• 販売店管理者に安全に送信してください</li>
                  {shopInfo.tempPassword && (
                    <li>• 初回ログイン後、パスワードを変更してください</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCopyCredentials}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                copied 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'コピー完了!' : 'ログイン情報をコピー'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
