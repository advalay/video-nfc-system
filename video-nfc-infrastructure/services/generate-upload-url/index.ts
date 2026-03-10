import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const bucketName = process.env.S3_BUCKET_NAME!;
const tableName = process.env.DYNAMODB_TABLE_VIDEO!;

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
    // REST APIの認証情報を取得
    const claims = event.requestContext.authorizer?.claims;
    const userGroups: string[] = claims?.['cognito:groups'] || [];
    const userRole = claims?.['custom:role'];
    const userEmail = claims?.['email'];
    const shopName = claims?.['custom:shopName'];
    const organizationName = claims?.['custom:organizationName'];

    // shop-admin, organization-admin, system-admin のみアップロード可能
    if (!userGroups.includes('shop-admin') &&
        !userGroups.includes('organization-admin') &&
        !userGroups.includes('system-admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. Only authorized users can upload videos.',
          },
        }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const fileName: string = body.fileName;
    const fileSize: number = body.fileSize;
    const contentType: string = body.contentType;
    const title: string = body.title || fileName;
    const description: string = body.description || '';
    const shopId: string = body.shopId;
    const organizationId: string = body.organizationId;

    // shopId と organizationId が必須
    if (!shopId || !organizationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_SHOP_INFO',
            message: 'shopId and organizationId are required in request body',
          },
        }),
      };
    }

    // system-admin以外は、UserShopRelationテーブルで権限チェック
    if (!userGroups.includes('system-admin')) {
      const userShopRelationTable = process.env.DYNAMODB_TABLE_USER_SHOP_RELATION!;
      const relationResult = await docClient.send(new GetCommand({
        TableName: userShopRelationTable,
        Key: {
          userId: userEmail,
          shopId: shopId,
        },
      }));

      if (!relationResult.Item) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SHOP_ACCESS_DENIED',
              message: 'You do not have permission to upload videos to this shop',
            },
          }),
        };
      }
    }

    if (!fileName || !contentType || !fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'fileName, fileSize, contentType are required',
          },
        }),
      };
    }

    // videoIdを生成
    const videoId = randomUUID();
    const s3Key = `videos/${organizationId}/${shopId}/${videoId}/${fileName}`;

    // S3 Pre-signed POST URL生成（AWS SDK v3）
    const { url: uploadUrl, fields } = await createPresignedPost(s3Client, {
      Bucket: bucketName,
      Key: s3Key,
      Conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024 * 1024], // 最大10GB
        ['eq', '$Content-Type', contentType],
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: 3600,
    });

    // 請求月（YYYY-MM形式）
    const billingMonth = new Date().toISOString().slice(0, 7);

    // DynamoDBにメタデータを保存
    const now = new Date().toISOString();
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        videoId,

        // 組織情報
        organizationId,
        shopId,
        shopName,
        organizationName,

        // 動画情報
        fileName,
        fileSize,
        s3Key,
        title,
        description,

        // アップロード情報
        uploader: userEmail,
        uploaderRole: userRole,
        uploadDate: now,
        uploadedAt: now,

        // ステータス（即完了）
        status: 'completed',

        // 請求情報
        billingMonth,
        billingStatus: 'pending',

        // タイムスタンプ
        createdAt: now,
        updatedAt: now,
      },
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          uploadUrl,
          fields,
          videoId,
          s3Key,
          expiresIn: 3600,
        },
      }),
    };
  } catch (err) {
    console.error('Error generating upload URL:', (err as Error).message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        },
      }),
    };
  }
};
