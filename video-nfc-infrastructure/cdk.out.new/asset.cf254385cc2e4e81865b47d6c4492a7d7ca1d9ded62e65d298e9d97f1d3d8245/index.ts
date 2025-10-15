import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;

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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
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

    let result;
    
    if (userGroups.includes('system-admin')) {
      // system-admin: 全動画を閲覧可能
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
      result = await docClient.send(command);
    } else if (userGroups.includes('organization-admin') && organizationId) {
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
    } else if (userGroups.includes('shop-user') && shopId) {
      // shop-user: 自分の販売店の動画のみ閲覧可能
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          videos: items,
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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

