import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const user = parseAuthUser(event);
  
  // 権限チェック
  if (!user.groups.includes('system-admin')) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: { code: 'FORBIDDEN', message: 'アクセス権限がありません' },
      }),
    };
  }
  
  const params = event.queryStringParameters || {};
  const organizationId = params.organizationId;
  const status = params.status || 'active';
  const search = params.search;
  const limit = parseInt(params.limit || '50');
  const lastKey = params.lastEvaluatedKey 
    ? JSON.parse(Buffer.from(params.lastEvaluatedKey, 'base64').toString())
    : undefined;
  
  try {
    let result;
    
    if (organizationId) {
      // 特定組織の動画を取得
      result = await dynamodb.send(new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_VIDEO,
        IndexName: 'organizationId-uploadDate-index',
        KeyConditionExpression: 'organizationId = :orgId',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':orgId': organizationId,
          ':status': status,
        },
        Limit: limit,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false, // 降順
      }));
    } else {
      // 全動画をスキャン
      result = await dynamodb.send(new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE_VIDEO,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Limit: limit,
        ExclusiveStartKey: lastKey,
      }));
    }
    
    let videos = result.Items || [];
    
    // ファイル名検索
    if (search) {
      videos = videos.filter(v => 
        v.fileName?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // ソート(Scanの場合)
    if (!organizationId) {
      videos.sort((a, b) => 
        (b.uploadDate || '').localeCompare(a.uploadDate || '')
      );
    }
    
    // ページングキーをBase64エンコード
    const nextKey = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          videos,
          total: videos.length,
          lastEvaluatedKey: nextKey,
          hasMore: !!result.LastEvaluatedKey,
        },
      }),
    };
    
  } catch (error: any) {
    console.error('Error listing all videos:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '動画一覧の取得に失敗しました' },
      }),
    };
  }
};
