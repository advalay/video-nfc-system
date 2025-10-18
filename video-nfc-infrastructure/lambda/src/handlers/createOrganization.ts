import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織作成開始', {}, event);
    
    const user = parseAuthUser(event);
    
    // 権限チェック: システム管理者のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織の作成はシステム管理者のみ実行できます');
    }
    
    const body = JSON.parse(event.body || '{}');
    
    // バリデーション
    if (!body.organizationType || !['agency', 'store'].includes(body.organizationType)) {
      throw new Error('組織タイプが不正です（"agency" または "store" を指定してください）');
    }
    
    if (!body.organizationName || !body.email) {
      throw new Error('必須項目が不足しています（organizationName, email は必須です）');
    }
    
    // 販売店の場合、parentIdは必須
    if (body.organizationType === 'store' && !body.parentId) {
      throw new Error('販売店にはparentId（親組織ID）が必須です');
    }
    const organizationId = `org-${body.organizationType}-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    
    const organization = {
      organizationId,
      organizationType: body.organizationType,
      organizationName: body.organizationName,
      parentId: body.parentId || null,
      level: body.organizationType === 'agency' ? 0 : 1,
      contactphone: body.contactphone || '',
      status: 'active',
      unitPrice: body.unitPrice || 1200,
      totalVideos: 0,
      totalStorage: 0,
      contractDate: now,
      createdAt: now,
      updatedAt: now,
    };
    
    await dynamodb.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Item: organization,
    }));
    
    logInfo('組織作成成功', { organizationId, organizationType: body.organizationType }, event);
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: organization,
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createOrganization');
  }
};
