import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('販売店削除開始', {}, event);
    
    const user = parseAuthUser(event);
    const { shopId } = event.pathParameters || {};
    
    // 権限チェック: system-admin のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('販売店の削除はシステム管理者のみ実行できます');
    }
    
    if (!shopId) {
      throw new Error('shopId（パスパラメータ）が必須です');
    }
    
    // 販売店の存在確認
    const existingShop = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Key: { shopId }
    }));
    
    if (!existingShop.Item) {
      throw new Error(`販売店が見つかりません（shopId: ${shopId}）`);
    }
    
    const organizationId = existingShop.Item.organizationId;
    const shopName = existingShop.Item.shopName;
    
    // 削除前の確認（動画データがある場合は警告）
    const totalVideos = existingShop.Item.totalVideos || 0;
    if (totalVideos > 0) {
      logInfo('警告: 動画データが存在する販売店を削除', { 
        shopId, 
        shopName, 
        totalVideos,
        organizationId 
      }, event);
    }
    
    // 販売店を削除
    await dynamodb.send(new DeleteCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Key: { shopId }
    }));
    
    // 組織テーブルのshopsフィールドからも削除
    const organization = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId }
    }));
    
    if (organization.Item && organization.Item.shops?.L) {
      const updatedShops = organization.Item.shops.L.filter((shop: any) => 
        shop.M?.id?.S !== shopId
      );
      
      await dynamodb.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        Item: {
          ...organization.Item,
          shops: { L: updatedShops },
          updatedAt: new Date().toISOString()
        }
      }));
    }
    
    logInfo('販売店削除成功', { 
      shopId, 
      shopName, 
      organizationId,
      totalVideos 
    }, event);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: `販売店「${shopName}」を削除しました`,
        data: {
          shopId,
          shopName,
          organizationId,
          deletedVideos: totalVideos
        }
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'deleteShop');
  }
};
