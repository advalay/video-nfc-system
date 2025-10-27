import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// AWS SDK v2設定（チェックサム問題を回避）
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const bucketName = process.env.S3_BUCKET_NAME!;
const tableName = process.env.DYNAMODB_TABLE_VIDEO!;

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
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

    const body = event.body ? JSON.parse(event.body) : {};
    const fileName: string = body.fileName;
    const fileSize: number = body.fileSize;
    const contentType: string = body.contentType;
    const title: string = body.title || fileName;
    const description: string = body.description || '';
    const shopId: string = body.shopId; // マルチショップ対応: リクエストボディから取得
    const organizationId: string = body.organizationId; // リクエストボディから取得

    // shopId と organizationId が必須
    if (!shopId || !organizationId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
      const relationResult = await dynamodb.get({
        TableName: userShopRelationTable,
        Key: {
          userId: userEmail,
          shopId: shopId,
        },
      }).promise();

      if (!relationResult.Item) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
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

    // S3署名付きURL生成（AWS SDK v2使用）
    // 注: Object Lock有効バケットでは署名URLでのアップロードが制限される
    // そのため、Pre-signed POST URLを使用する必要がある
    const params = {
      Bucket: bucketName,
      Fields: {
        key: s3Key,
        'Content-Type': contentType,
      },
      Expires: 3600,
      Conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024 * 1024], // 最大10GB
      ],
    };
    
    const uploadUrl = s3.createPresignedPost(params);

    // 請求月（YYYY-MM形式）
    const billingMonth = new Date().toISOString().slice(0, 7);

    // DynamoDBにメタデータを保存
    const now = new Date().toISOString();
    await dynamodb.put({
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
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          uploadUrl: uploadUrl.url,
          fields: uploadUrl.fields,
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


