import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const bucketName = process.env.S3_BUCKET_NAME!;
const tableName = process.env.DYNAMODB_TABLE_VIDEO!;

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    // REST APIの認証情報を取得
    const claims = event.requestContext.authorizer?.claims;
    const userGroups: string[] = claims?.['cognito:groups'] || [];
    const organizationId = claims?.['custom:organizationId'];
    const shopId = claims?.['custom:shopId'];
    const userRole = claims?.['custom:role'];
    const userEmail = claims?.['email'];

    // shop-admin, organization-admin, system-admin のみアップロード可能
    if (!userGroups.includes('shop-admin') &&
        !userGroups.includes('organization-admin') && 
        !userGroups.includes('system-admin')) {
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
            message: 'Access denied. Only authorized users can upload videos.',
          },
        }),
      };
    }

    // organizationId と shopId が必須
    if (!organizationId || !shopId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_USER_ATTRIBUTES',
            message: 'User organizationId and shopId are required',
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

    if (!fileName || !contentType || !fileSize) {
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
            message: 'fileName, fileSize, contentType are required',
          },
        }),
      };
    }

    // videoIdを生成
    const videoId = uuidv4();
    const timestamp = Date.now();
    const s3Key = `videos/${organizationId}/${shopId}/${videoId}/${fileName}`;

    // S3署名付きURL生成
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1時間有効

    // 請求月（YYYY-MM形式）
    const billingMonth = new Date().toISOString().slice(0, 7);

    // DynamoDBにメタデータを保存
    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          videoId,
          
          // 組織情報
          organizationId,
          shopId,
          
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
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          uploadUrl,
          videoId,
          s3Key,
          expiresIn: 3600,
        },
      }),
    };
  } catch (err) {
    console.error('Error generating upload URL:', err);
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
          message: 'Failed to generate upload URL',
        },
      }),
    };
  }
};


