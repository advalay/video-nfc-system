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

    // 組織データを整形
    const organizations: Organization[] = result.Items
      .filter(item => item.type === 'organization')
      .map(item => ({
        organizationId: item.organizationId || item.id,
        organizationName: item.name || item.organizationName,
        shopCount: item.shopCount || 0,
        totalVideos: item.totalVideos || 0,
        totalSize: item.totalSize || 0,
        monthlyVideos: item.monthlyVideos || 0,
        weeklyVideos: item.weeklyVideos || 0,
        status: item.status || 'active',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt,
        shops: item.shops || []
      }));

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
