import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織一覧取得開始', {}, event);
    
    const user = parseAuthUser(event);
    const params = event.queryStringParameters || {};
    
    // 権限チェック
    const isSystemAdmin = user.groups.includes('system-admin');
    const isOrganizationAdmin = user.groups.includes('organization-admin');
    
    if (!isSystemAdmin && !isOrganizationAdmin) {
      throw new Error('組織一覧へのアクセス権限がありません');
    }
    let organizations: any[] = [];
    
    if (isSystemAdmin) {
      // システム管理者: 全組織取得
      const result = await dynamodb.send(new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'active' },
      }));
      organizations = result.Items || [];
      
    } else if (isOrganizationAdmin) {
      // 組織管理者: 自組織のみ取得
      const result = await dynamodb.send(new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        KeyConditionExpression: 'organizationId = :orgId',
        ExpressionAttributeValues: { ':orgId': user.organizationId },
      }));
      organizations = result.Items || [];
    }
    
    // タイプフィルタ
    if (params.type) {
      organizations = organizations.filter(o => o.organizationType === params.type);
    }
    
    // 親IDフィルタ
    if (params.parentId) {
      organizations = organizations.filter(o => o.parentId === params.parentId);
    }
    
    // ソート: 組織名昇順
    organizations.sort((a, b) => 
      (a.organizationName || '').localeCompare(b.organizationName || '')
    );
    
    logInfo('組織一覧取得成功', { total: organizations.length }, event);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          organizations,
          total: organizations.length,
        },
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'listOrganizations');
  }
};
