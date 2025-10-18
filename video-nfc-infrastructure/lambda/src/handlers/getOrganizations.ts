import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError } from '../lib/errorHandler';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_ORGANIZATION || '';

interface Organization {
  organizationId: string;
  organizationName: string;
  shopCount: number;
  totalVideos: number;
  totalSize: number;
  monthlyVideos: number;
  weeklyVideos: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  shops: any[];
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 開発環境では認証をスキップ
    let user;
    if (process.env.ENVIRONMENT === 'dev' && event.headers?.['x-development-mode'] === 'true') {
      console.log('Development mode: Skipping authentication');
      user = {
        userId: 'dev-user',
        email: 'dev@example.com',
        groups: ['system-admin'],
        role: 'system-admin'
      };
    } else {
      // 認証チェック
      user = parseAuthUser(event);
    }
    
    // システム管理者のみアクセス可能
    if (!user.groups?.includes('system-admin')) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            message: 'アクセス権限がありません',
            code: 'FORBIDDEN'
          }
        })
      };
    }

    // 組織データを取得
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'attribute_not_exists(#status) OR #status <> :suspended',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':suspended': 'suspended'
      }
    });

    const result = await docClient.send(scanCommand);
    
    if (!result.Items) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
        },
        body: JSON.stringify({
          success: true,
          data: {
            organizations: []
          }
        })
      };
    }

    // 販売店データを取得
    const shopsResult = await docClient.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      FilterExpression: 'attribute_exists(shopId) AND (#status = :active OR attribute_not_exists(#status))',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' }
    }));
    const shops = shopsResult.Items || [];

    // 動画データを取得
    const videosResult = await docClient.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_VIDEO,
      FilterExpression: 'attribute_exists(videoId)'
    }));
    const videos = videosResult.Items || [];

    // 現在の日時を取得
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 組織データを整形
    const organizations: Organization[] = result.Items
      .filter(item => item.organizationId) // organizationIdが存在するもののみ
      .map(item => {
        const orgId = item.organizationId;
        
        // 販売店数を集計
        const orgShops = shops.filter(s => s.organizationId === orgId);
        
        // 動画データを集計
        const orgVideos = videos.filter(v => v.organizationId === orgId);
        const totalVideos = orgVideos.length;
        const totalSize = orgVideos.reduce((sum, v) => sum + (v.fileSize || 0), 0);
        
        // 今月・今週の動画を計算
        const monthlyVideos = orgVideos.filter(v => {
          const uploadDate = new Date(v.uploadDate || v.createdAt);
          return uploadDate >= startOfMonth;
        }).length;
        
        const weeklyVideos = orgVideos.filter(v => {
          const uploadDate = new Date(v.uploadDate || v.createdAt);
          return uploadDate >= startOfWeek;
        }).length;
        
        return {
          organizationId: orgId,
          organizationName: item.organizationName || item.name,
          shopCount: orgShops.length,
          totalVideos,
          totalSize,
          monthlyVideos,
          weeklyVideos,
          status: item.status || 'active',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt,
          shops: orgShops
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        data: {
          organizations
        }
      })
    };

  } catch (error) {
    console.error('Error in getOrganizations:', error);
    return handleError(error, event, 'getOrganizations');
  }
};
