import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_VIDEO!;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME!;

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const videoId = event.pathParameters?.videoId;

    if (!videoId) {
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
            message: 'videoId is required',
          },
        }),
      };
    }

    // DynamoDBから動画メタデータを取得
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { videoId },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Video not found',
          },
        }),
      };
    }

    // アクセス制御：販売店ユーザーのみ削除可能（認証情報は任意チェーンで安全に参照）
    const claims: any = event.requestContext?.authorizer?.claims || {};
    const userGroups: string[] = (claims?.['cognito:groups'] as string[]) || [];
    const userId = (claims?.sub as string) || 'unknown';
    const userEmail = (claims?.email as string) || 'unknown';
    const sourceIp = (event.requestContext as any)?.identity?.sourceIp || (event.headers?.['x-forwarded-for'] || '').split(',')[0] || 'unknown';

    if (!userGroups.includes('shop-user')) {
      // 監査ログ（権限不足）
      console.warn(JSON.stringify({
        level: 'WARN',
        action: 'DELETE_VIDEO',
        outcome: 'FORBIDDEN',
        reason: 'Only shop users can delete videos',
        videoId,
        requestId: event.requestContext.requestId,
        user: { userId, userEmail, userGroups },
        sourceIp,
        timestamp: new Date().toISOString(),
      }));

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
            message: 'Only shop users can delete videos',
          },
        }),
      };
    }

    // 販売店ユーザーの場合、自分の組織の動画のみ削除可能
    const userOrganizationId = claims?.['custom:organizationId'] as string;
    const userShopId = claims?.['custom:shopId'] as string;
    
    // 動画の所有者をチェック
    const videoOrganizationId = result.Item.organizationId;
    const videoShopId = result.Item.shopId;
    
    if (videoShopId && videoShopId !== userShopId) {
      console.warn(JSON.stringify({
        level: 'WARN',
        action: 'DELETE_VIDEO',
        outcome: 'FORBIDDEN',
        reason: 'Cannot delete video from different shop',
        videoId,
        requestId: event.requestContext.requestId,
        user: { userId, userEmail, userOrganizationId, userShopId },
        video: { videoOrganizationId, videoShopId },
        sourceIp,
        timestamp: new Date().toISOString(),
      }));

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
            message: 'You can only delete videos from your own shop',
          },
        }),
      };
    }

    // アップロード後6時間以内のみ削除可能（ビジネスモデル上の制約）
    const uploadedAt = result.Item.createdAt;
    if (uploadedAt) {
      const uploadTime = new Date(uploadedAt).getTime();
      const currentTime = Date.now();
      const sixHoursInMs = 6 * 60 * 60 * 1000; // 6時間をミリ秒に変換
      const timeSinceUpload = currentTime - uploadTime;

      if (timeSinceUpload > sixHoursInMs) {
        console.warn(JSON.stringify({
          level: 'WARN',
          action: 'DELETE_VIDEO',
          outcome: 'FORBIDDEN',
          reason: 'Cannot delete video after 6 hours grace period',
          videoId,
          requestId: event.requestContext.requestId,
          user: { userId, userEmail, userShopId },
          uploadedAt,
          timeSinceUploadHours: (timeSinceUpload / (60 * 60 * 1000)).toFixed(2),
          sourceIp,
          timestamp: new Date().toISOString(),
        }));

        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: {
              code: 'GRACE_PERIOD_EXPIRED',
              message: 'Videos can only be deleted within 6 hours of upload',
              details: {
                uploadedAt,
                timeSinceUploadHours: (timeSinceUpload / (60 * 60 * 1000)).toFixed(2),
              },
            },
          }),
        };
      }
    }

    // S3から動画ファイルを削除
    // 注意: Object Lock が有効な場合、削除できない可能性があります
    let s3DeleteResult: { video?: boolean; thumbnail?: boolean } = {};
    try {
      if (result.Item.s3Key) {
        const deleteVideoCommand = new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: result.Item.s3Key,
        });
        await s3Client.send(deleteVideoCommand);
        s3DeleteResult.video = true;
      }

      // サムネイルも削除
      if (result.Item.thumbnailS3Key) {
        const deleteThumbnailCommand = new DeleteObjectCommand({
          Bucket: ASSETS_BUCKET_NAME,
          Key: result.Item.thumbnailS3Key,
        });
        await s3Client.send(deleteThumbnailCommand);
        s3DeleteResult.thumbnail = true;
      }
    } catch (s3Error) {
      console.error(JSON.stringify({
        level: 'ERROR',
        action: 'DELETE_VIDEO_S3',
        outcome: 'ERROR',
        videoId,
        requestId: event.requestContext.requestId,
        user: { userId, userEmail },
        sourceIp,
        error: (s3Error as Error)?.message || 'Unknown S3 error',
        timestamp: new Date().toISOString(),
      }));
      // Object Lockなどで削除できない場合もメタデータは削除する
    }

    // DynamoDBからメタデータを削除
    const deleteCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { videoId },
    });

    await docClient.send(deleteCommand);

    // 監査ログ（成功）
    console.log(JSON.stringify({
      level: 'INFO',
      action: 'DELETE_VIDEO',
      outcome: 'SUCCESS',
      videoId,
      s3DeleteResult,
      requestId: event.requestContext.requestId,
      user: { userId, userEmail, userGroups },
      sourceIp,
      timestamp: new Date().toISOString(),
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Video deleted successfully',
          videoId,
        },
      }),
    };
  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      action: 'DELETE_VIDEO',
      outcome: 'ERROR',
      requestId: event.requestContext?.requestId,
      error: (error as Error)?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    }));
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
          message: 'Failed to delete video',
        },
      }),
    };
  }
};

