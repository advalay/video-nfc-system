import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;

// CORSヘッダーを定義
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

interface ListVideosQueryParams {
  limit?: string;
  lastEvaluatedKey?: string;
  search?: string;
}

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams: ListVideosQueryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 50;
    const search = queryParams.search;
    
    let lastEvaluatedKey;
    if (queryParams.lastEvaluatedKey) {
      try {
        lastEvaluatedKey = JSON.parse(decodeURIComponent(queryParams.lastEvaluatedKey));
      } catch (e) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid lastEvaluatedKey format',
            },
          }),
        };
      }
    }

    // 開発環境では認証をスキップ
    let claims, userGroups: string[], organizationId, shopId, customRole;
    
    if (process.env.ENVIRONMENT === 'dev' && event.headers?.['x-development-mode'] === 'true') {
      console.log('Development mode: Skipping authentication');
      claims = null;
      userGroups = ['system-admin'];
      organizationId = null;
      shopId = null;
    } else {
      // ユーザー情報を取得（Cognitoから）
      claims = event.requestContext?.authorizer?.claims;
      userGroups = claims?.['cognito:groups'] || [];
      organizationId = claims?.['custom:organizationId'];
      shopId = claims?.['custom:shopId'];
      customRole = claims?.['custom:role'];
      console.log('ListVideos auth:', { userGroups, organizationId, shopId, customRole });
    }

    let result;
    
    if (userGroups.includes('system-admin') || customRole === 'system-admin') {
      // system-admin: 全動画を閲覧可能
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
      result = await docClient.send(command);
    } else if ((userGroups.includes('organization-admin') || customRole === 'organization-admin') && organizationId) {
      // organization-admin: 自分の代理店配下の全動画を閲覧可能（全販売店含む）
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'organizationId-uploadDate-index',
        KeyConditionExpression: 'organizationId = :organizationId',
        ExpressionAttributeValues: {
          ':organizationId': organizationId,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // 新しい順
      });
      result = await docClient.send(command);
    } else if (shopId) {
      // shop-admin: 自分の販売店の動画のみ閲覧可能
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'shopId-uploadDate-index',
        KeyConditionExpression: 'shopId = :shopId',
        ExpressionAttributeValues: {
          ':shopId': shopId,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // 新しい順
      });
      result = await docClient.send(command);
    } else {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        }),
      };
    }

    // 検索フィルタリング（クライアント側）
    let items = result.Items || [];
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item: any) => 
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.videoId?.toLowerCase().includes(searchLower)
      );
    }

    // 表示用に既存データを正規化
    // VideoMetadataテーブルに既にshopName/organizationNameが保存されているため、
    // 追加のDynamoDBクエリは不要
    const normalized = items.map((item: any) => ({
      ...item,
      uploadedAt: item.uploadedAt || item.uploadDate,
      status: item.status || 'completed',
      // shopNameとorganizationNameはVideoMetadataテーブルから取得済み
      shopName: item.shopName || '不明な店舗',
      organizationName: item.organizationName || '不明な組織',
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          videos: normalized,
          totalCount: items.length,
          lastEvaluatedKey: result.LastEvaluatedKey 
            ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
            : null,
        },
      }),
    };
  } catch (error) {
    console.error('Error listing videos:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list videos',
        },
      }),
    };
  }
};

