import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('販売店作成開始', {}, event);
    
    const user = parseAuthUser(event);
    const body = JSON.parse(event.body || '{}');
    
    // 権限チェック: organization-admin のみ
    if (!user.groups.includes('organization-admin')) {
      throw new Error('販売店の作成は組織管理者のみ実行できます');
    }
    
    // 必須フィールドの検証
    const { shopName, organizationId, contactEmail, contactPhone } = body;
    
    if (!shopName || !organizationId) {
      throw new Error('shopName と organizationId は必須です');
    }
    
    // ユーザーが所属する組織のIDと一致するかチェック
    if (user.organizationId !== organizationId) {
      throw new Error('自社の販売店のみ作成できます');
    }
    
    // 販売店IDを生成（SHOP_組織ID_連番）
    const timestamp = Date.now();
    const shopId = `SHOP_${organizationId}_${timestamp}`;
    
    // 販売店データを作成
    const shopData = {
      shopId,
      shopName,
      organizationId,
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 統計情報は初期値で設定
      totalVideos: 0,
      totalSize: 0,
      monthlyVideos: 0,
      weeklyVideos: 0
    };
    
    // DynamoDBに保存
    await dynamodb.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Item: shopData,
      ConditionExpression: 'attribute_not_exists(shopId)', // 重複チェック
    }));
    
    // 組織テーブルのshopsフィールドも更新
    const organization = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId }
    }));
    
    if (organization.Item) {
      const existingShops = organization.Item.shops?.L || [];
      const newShop = {
        M: {
          id: { S: shopId },
          name: { S: shopName },
          email: { S: contactEmail || '' },
          status: { S: 'active' }
        }
      };
      
      await dynamodb.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        Item: {
          ...organization.Item,
          shops: {
            L: [...existingShops, newShop]
          },
          updatedAt: new Date().toISOString()
        }
      }));
    }
    
    logInfo('販売店作成成功', { shopId, shopName, organizationId }, event);
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: shopData,
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createShop');
  }
};
