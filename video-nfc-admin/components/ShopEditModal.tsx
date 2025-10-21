'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Shop, UpdateShopInput } from '../types/shared';

interface ShopEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop | null;
  onSave: (shopId: string, data: UpdateShopInput) => Promise<void>;
}

export default function ShopEditModal({
  isOpen,
  onClose,
  shop,
  onSave
}: ShopEditModalProps) {
  const [formData, setFormData] = useState<UpdateShopInput>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームデータを初期化
  useEffect(() => {
    if (shop) {
      setFormData({
        shopName: shop.shopName || '',
        contactPerson: shop.contactPerson || '',
        contactEmail: shop.contactEmail || '',
        contactPhone: shop.contactPhone || ''
      });
    }
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    // バリデーション
    if (!formData.contactPerson?.trim()) {
      setError('担当者名は必須です');
      return;
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(shop.shopId, formData);
      onClose();
    } catch (err: any) {
      setError(err.message || '更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateShopInput, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // エラーをクリア
    if (error) setError(null);
  };

  if (!isOpen || !shop) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            販売店情報を編集
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 販売店名（読み取り専用） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              販売店名
            </label>
            <input
              type="text"
              value={shop.shopName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">販売店名は変更できません</p>
          </div>

          {/* 担当者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当者名 *
            </label>
            <input
              type="text"
              value={formData.contactPerson || ''}
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="山田 太郎"
              required
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              連絡先メールアドレス
            </label>
            <input
              type="email"
              value={formData.contactEmail || ''}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@example.com"
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.contactPhone || ''}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="03-1234-5678"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

