import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;

const getCorsHeaders = (event: any): Record<string, string> => {
  const origin = event.headers?.Origin || event.headers?.origin || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
  };
};

interface ListVideosQueryParams {
  limit?: string;
  lastEvaluatedKey?: string;
  search?: string;
  shopId?: string;
}

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const headers = getCorsHeaders(event);

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
          headers,
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

    // ユーザー情報を取得（Cognitoから）
    const claims = event.requestContext?.authorizer?.claims;
    const userGroups: string[] = claims?.['cognito:groups'] || [];
    const organizationId = claims?.['custom:organizationId'];
    const shopId = claims?.['custom:shopId'];
    const customRole = claims?.['custom:role'];

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
      // organization-admin: 自分の代理店配下の全動画を閲覧可能
      const filterShopId = queryParams.shopId;

      if (filterShopId) {
        const command = new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'shopId-uploadDate-index',
          KeyConditionExpression: 'shopId = :shopId',
          ExpressionAttributeValues: {
            ':shopId': filterShopId,
          },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: false,
        });
        result = await docClient.send(command);
      } else {
        const command = new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'organizationId-uploadDate-index',
          KeyConditionExpression: 'organizationId = :organizationId',
          ExpressionAttributeValues: {
            ':organizationId': organizationId,
          },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: false,
        });
        result = await docClient.send(command);
      }
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
        ScanIndexForward: false,
      });
      result = await docClient.send(command);
    } else {
      return {
        statusCode: 403,
        headers,
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
    const normalized = items.map((item: any) => ({
      ...item,
      uploadedAt: item.uploadedAt || item.uploadDate,
      status: item.status || 'completed',
      shopName: item.shopName || item.shopId || '不明な店舗',
      organizationName: item.organizationName || item.organizationId || '不明な組織',
    }));

    return {
      statusCode: 200,
      headers,
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
    console.error('Error listing videos:', (error as Error).message);
    return {
      statusCode: 500,
      headers,
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
