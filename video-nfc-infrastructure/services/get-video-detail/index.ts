import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

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

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const headers = getCorsHeaders(event);

  try {
    const videoId = event.pathParameters?.videoId;

    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'videoId is required',
          },
        }),
      };
    }

    // DynamoDBから動画メタデータを取得
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { videoId },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Video not found',
          },
        }),
      };
    }

    // アクセス制御：ユーザーのグループと組織IDをチェック
    const claims = event.requestContext.authorizer?.claims;
    const userGroups: string[] = claims?.['cognito:groups'] || [];
    const userOrganizationId = claims?.['custom:organizationId'];
    const userShopId = claims?.['custom:shopId'];

    const videoOrganizationId = result.Item.organizationId;
    const videoShopId = result.Item.shopId;

    // アクセス制御
    if (userGroups.includes('system-admin')) {
      // system-admin: 全動画にアクセス可能
    } else if (userGroups.includes('organization-admin')) {
      if (videoOrganizationId !== userOrganizationId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this video',
            },
          }),
        };
      }
    } else if (userGroups.includes('shop-admin')) {
      if (videoShopId !== userShopId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this video',
            },
          }),
        };
      }
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

    // CloudFrontのURLを付与
    const videoData = {
      ...result.Item,
      videoUrl: `https://${CLOUDFRONT_DOMAIN}/${result.Item.s3Key}`,
      thumbnailUrl: result.Item.thumbnailS3Key
        ? `https://${CLOUDFRONT_DOMAIN}/${result.Item.thumbnailS3Key}`
        : null,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: videoData,
      }),
    };
  } catch (error) {
    console.error('Error getting video detail:', (error as Error).message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get video detail',
        },
      }),
    };
  }
};
