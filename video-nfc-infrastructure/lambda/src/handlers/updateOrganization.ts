import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織更新開始', {}, event);
    
    const user = parseAuthUser(event);
    const { organizationId } = event.pathParameters || {};
    
    // 権限チェック
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織の更新はシステム管理者のみ実行できます');
    }
    
    if (!organizationId) {
      throw new Error('organizationId（パスパラメータ）が必須です');
    }
    
    const body = JSON.parse(event.body || '{}');
    // 組織存在確認
    const existing = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId },
    }));
    
    if (!existing.Item) {
      throw new Error(`組織が見つかりません（organizationId: ${organizationId}）`);
    }
    
    // 更新可能なフィールドのみ
    const updateExpressions = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};
    
    if (body.organizationName) {
      updateExpressions.push('#name = :name');
      attributeNames['#name'] = 'organizationName';
      attributeValues[':name'] = body.organizationName;
    }
    
    if (body.email) {
      updateExpressions.push('email = :email');
      attributeValues[':email'] = body.email;
    }
    
    if (body.phone !== undefined) {
      updateExpressions.push('phone = :phone');
      attributeValues[':phone'] = body.phone;
    }
    
    if (body.address !== undefined) {
      updateExpressions.push('address = :address');
      attributeValues[':address'] = body.address;
    }
    
    if (body.status) {
      updateExpressions.push('#status = :status');
      attributeNames['#status'] = 'status';
      attributeValues[':status'] = body.status;
    }
    
    if (body.unitPrice !== undefined) {
      updateExpressions.push('unitPrice = :unitPrice');
      attributeValues[':unitPrice'] = body.unitPrice;
    }
    
    // updatedAt は常に更新
    updateExpressions.push('updatedAt = :updatedAt');
    attributeValues[':updatedAt'] = new Date().toISOString();
    
    const result = await dynamodb.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    
    logInfo('組織更新成功', { organizationId }, event);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: result.Attributes,
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'updateOrganization');
  }
};
