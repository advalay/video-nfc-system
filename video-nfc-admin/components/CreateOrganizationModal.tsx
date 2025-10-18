'use client';

import { useState } from 'react';
import { X, Building2, Mail, Phone, MapPin, User } from 'lucide-react';
import { createOrganization } from '../lib/api-client';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (organizationInfo: {
    organizationId: string;
    organizationName: string;
    email: string;
    tempPassword: string;
    loginUrl: string;
  }) => void;
}

interface OrganizationFormData {
  organizationName: string;
  organizationType: 'agency' | 'store';
  email: string;
  contactPerson: string;
  contactphone: string;
  contactEmail: string;
  billingAddress: string;
}

export default function CreateOrganizationModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateOrganizationModalProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: '',
    organizationType: 'agency',
    email: '',
    contactPerson: '',
    contactphone: '',
    contactEmail: '',
    billingAddress: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<OrganizationFormData>>({});

  const handleInputChange = (field: keyof OrganizationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<OrganizationFormData> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = '組織名は必須です';
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
      const response = await createOrganization(formData);
      
      // 成功時の処理
      onSuccess({
        organizationId: response.organizationId,
        organizationName: response.organizationName,
        email: response.email,
        tempPassword: response.tempPassword,
        loginUrl: response.loginUrl || window.location.origin + '/login'
      });
      
      onClose();
      
      // フォームをリセット
      setFormData({
        organizationName: '',
        organizationType: 'agency',
        email: '',
        contactPerson: '',
        contactphone: '',
        contactEmail: '',
        billingAddress: ''
      });
      
    } catch (error: any) {
      console.error('組織作成エラー:', error);
      
      // エラーメッセージを表示
      const errorMessage = error.message || '組織の作成に失敗しました';
      alert(`エラー: ${errorMessage}`);
      
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">新規組織追加</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              基本情報
            </h3>
            
            {/* 組織名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                組織名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.organizationName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: パートナー企業C"
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">{errors.organizationName}</p>
              )}
            </div>

            {/* 組織タイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                組織タイプ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.organizationType}
                onChange={(e) => handleInputChange('organizationType', e.target.value as 'agency' | 'store')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="agency">パートナー企業</option>
                <option value="store">販売店</option>
              </select>
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
                  placeholder="例: admin@company-c.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* 連絡先情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              連絡先情報
            </h3>
            
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

            {/* 電話番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contactphone}
                  onChange={(e) => handleInputChange('contactphone', e.target.value)}
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
                  placeholder="例: contact@company-c.com"
                />
              </div>
            </div>

            {/* 請求先住所 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請求先住所
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="例: 東京都渋谷区渋谷1-1-1 経理部宛"
                />
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
                '組織を作成'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
