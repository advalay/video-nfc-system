import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('販売店更新開始', {}, event);
    
    const user = parseAuthUser(event);
    const { shopId } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    
    if (!shopId) {
      throw new Error('shopId（パスパラメータ）が必須です');
    }
    
    // 権限チェック: organization-admin のみ
    if (!user.groups.includes('organization-admin')) {
      throw new Error('販売店の更新は組織管理者のみ実行できます');
    }
    
    // 販売店の存在確認と所属組織チェック
    const existingShop = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Key: { shopId }
    }));
    
    if (!existingShop.Item) {
      throw new Error(`販売店が見つかりません（shopId: ${shopId}）`);
    }
    
    // ユーザーが所属する組織の販売店かチェック
    if (user.organizationId !== existingShop.Item.organizationId) {
      throw new Error('自社の販売店のみ更新できます');
    }
    
    // 更新可能なフィールドのみ
    const updateExpressions = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};
    
    if (body.shopName) {
      updateExpressions.push('#name = :name');
      attributeNames['#name'] = 'shopName';
      attributeValues[':name'] = body.shopName;
    }
    
    if (body.contactEmail !== undefined) {
      updateExpressions.push('contactEmail = :contactEmail');
      attributeValues[':contactEmail'] = body.contactEmail;
    }
    
    if (body.contactPhone !== undefined) {
      updateExpressions.push('contactPhone = :contactPhone');
      attributeValues[':contactPhone'] = body.contactPhone;
    }
    
    if (body.status) {
      updateExpressions.push('#status = :status');
      attributeNames['#status'] = 'status';
      attributeValues[':status'] = body.status;
    }
    
    // updatedAt は常に更新
    updateExpressions.push('updatedAt = :updatedAt');
    attributeValues[':updatedAt'] = new Date().toISOString();
    
    if (updateExpressions.length === 1) { // updatedAt のみの場合
      throw new Error('更新するフィールドが指定されていません');
    }
    
    const result = await dynamodb.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Key: { shopId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    
    // 組織テーブルのshopsフィールドも更新
    if (body.shopName) {
      const organization = await dynamodb.send(new GetCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        Key: { organizationId: existingShop.Item.organizationId }
      }));
      
      if (organization.Item && organization.Item.shops?.L) {
        const updatedShops = organization.Item.shops.L.map((shop: any) => {
          if (shop.M?.id?.S === shopId) {
            return {
              M: {
                ...shop.M,
                name: { S: body.shopName }
              }
            };
          }
          return shop;
        });
        
        await dynamodb.send(new PutCommand({
          TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
          Item: {
            ...organization.Item,
            shops: { L: updatedShops },
            updatedAt: new Date().toISOString()
          }
        }));
      }
    }
    
    logInfo('販売店更新成功', { shopId }, event);
    
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
    return handleError(error, event, 'updateShop');
  }
};
