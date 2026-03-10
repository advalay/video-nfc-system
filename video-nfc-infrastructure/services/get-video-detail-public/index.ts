import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

// 公開エンドポイントはCORS `*` を許可（NFCタグからのアクセスのため）
const PUBLIC_CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * 公開エンドポイント：NFCタグから動画を閲覧する際に使用
 * 認証不要
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const videoId = event.pathParameters?.videoId;

    if (!videoId) {
      return {
        statusCode: 400,
        headers: PUBLIC_CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'videoId is required',
          },
        }),
      };
    }

    // videoIdの形式を検証（UUID形式のみ許可）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      return {
        statusCode: 400,
        headers: PUBLIC_CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Invalid videoId format',
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
        headers: PUBLIC_CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Video not found',
          },
        }),
      };
    }

    // 公開用に必要な情報のみ返す（機密情報を除外）
    const videoData = {
      videoId: result.Item.videoId,
      title: result.Item.title,
      description: result.Item.description,
      videoUrl: `https://${CLOUDFRONT_DOMAIN}/${result.Item.s3Key}`,
      thumbnailUrl: result.Item.thumbnailS3Key
        ? `https://${CLOUDFRONT_DOMAIN}/${result.Item.thumbnailS3Key}`
        : null,
      duration: result.Item.duration,
      uploadDate: result.Item.uploadDate,
      viewCount: result.Item.viewCount || 0,
    };

    return {
      statusCode: 200,
      headers: PUBLIC_CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: videoData,
      }),
    };
  } catch (error) {
    console.error('Error getting public video detail:', (error as Error).message);
    return {
      statusCode: 500,
      headers: PUBLIC_CORS_HEADERS,
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
