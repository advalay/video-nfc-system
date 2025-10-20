'use client';

import { useState } from 'react';
import { X, Store, Mail, Phone, User } from 'lucide-react';
import { createShop } from '../lib/api-client';

interface CreateShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onSuccess: (shopInfo: {
    shopId: string;
    shopName: string;
    email: string;
    tempPassword?: string;
    loginUrl: string;
    isExistingUser?: boolean;
  }) => void;
}

interface ShopFormData {
  shopName: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
}

export default function CreateShopModal({ 
  isOpen, 
  onClose, 
  organizationId,
  organizationName,
  onSuccess 
}: CreateShopModalProps) {
  const [formData, setFormData] = useState<ShopFormData>({
    shopName: '',
    email: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ShopFormData>>({});

  const handleInputChange = (field: keyof ShopFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ShopFormData> = {};

    if (!formData.shopName.trim()) {
      newErrors.shopName = '販売店名は必須です';
    }

    if (!formData.email.trim()) {
      newErrors.email = '管理者メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = '担当者名は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // API呼び出し
      const response = await createShop({
        shopName: formData.shopName,
        organizationId,
        email: formData.email, // 管理者メールアドレス
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail
      });
      
      // 成功時の処理
      onSuccess({
        shopId: response.shopId,
        shopName: response.shopName,
        email: response.email,
        tempPassword: response.tempPassword || undefined,
        loginUrl: response.loginUrl || window.location.origin + '/login',
        isExistingUser: response.isExistingUser
      });
      
      onClose();
      
      // フォームをリセット
      setFormData({
        shopName: '',
        email: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: ''
      });
      
    } catch (error: any) {
      console.error('販売店作成エラー:', error);
      
      // エラーメッセージを表示
      const errorMessage = error.message || '販売店の作成に失敗しました';
      alert(`エラー: ${errorMessage}`);
      
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Store className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">販売店追加</h2>
              <p className="text-sm text-gray-600">{organizationName} に販売店を追加します</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 販売店名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              販売店名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => handleInputChange('shopName', e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.shopName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 店舗C_a"
              />
            </div>
            {errors.shopName && (
              <p className="mt-1 text-sm text-red-600">{errors.shopName}</p>
            )}
          </div>

          {/* 担当者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当者名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 田中太郎"
              />
            </div>
            {errors.contactPerson && (
              <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
            )}
          </div>

          {/* 管理者メール */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              管理者メールアドレス <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: shop-ca@company-c.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* 電話番号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              電話番号
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 03-1234-5678"
              />
            </div>
          </div>

          {/* 連絡先メール */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              連絡先メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: contact@shop-ca.com"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>作成中...</span>
                </div>
              ) : (
                '販売店を作成'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
