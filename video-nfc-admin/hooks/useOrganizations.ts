import { useState, useEffect } from 'react';
import { Organization } from '../types/shared';
import { apiGet } from '../lib/api-client';

interface UseOrganizationsResult {
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrganizations(): UseOrganizationsResult {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiGet<any>('/organizations');
        
        // バックエンドのレスポンスをフロントエンドの型に変換
        const organizations = response.organizations || [];
        setOrganizations(organizations);
        return;
      } catch (apiError) {
        console.error('API call failed, falling back to mock data:', apiError);
        // API呼び出しが失敗した場合はモックデータを使用
      }

      // 一時的にモックデータを使用
      const mockOrganizations: Organization[] = [
        {
          organizationId: 'org-agency-0271a85c',
          organizationName: '株式会社Advalay',
          shopCount: 2,
          totalVideos: 15,
          totalSize: 1024000000,
          monthlyVideos: 3,
          weeklyVideos: 1,
          status: 'active',
          createdAt: '2025-10-12T04:57:38.209Z',
          shops: []
        },
        {
          organizationId: 'org-agency-96e2ab4c',
          organizationName: 'テスト代理店',
          shopCount: 1,
          totalVideos: 8,
          totalSize: 512000000,
          monthlyVideos: 2,
          weeklyVideos: 0,
          status: 'active',
          createdAt: '2025-10-08T05:39:07.302Z',
          shops: []
        },
        {
          organizationId: 'org-agency-f409c54e',
          organizationName: '株式会社YELL',
          shopCount: 1,
          totalVideos: 5,
          totalSize: 256000000,
          monthlyVideos: 1,
          weeklyVideos: 0,
          status: 'active',
          createdAt: '2025-10-10T05:50:47.466Z',
          shops: []
        }
      ];

      // モックデータを設定
      setOrganizations(mockOrganizations);

    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err.message : '組織一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    isLoading,
    error,
    refetch: fetchOrganizations,
  };
}

