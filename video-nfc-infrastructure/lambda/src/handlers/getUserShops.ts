import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('ユーザーの管理販売店一覧取得開始', {}, event);

    const user = parseAuthUser(event);
    const userId = user.email; // emailをuserIdとして使用

    // UserShopRelationテーブルからユーザーの管理販売店を取得
    const result = await dynamodb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE_USER_SHOP_RELATION,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }));

    const shops = result.Items || [];

    logInfo('ユーザーの管理販売店一覧取得成功', {
      userId,
      shopCount: shops.length,
    }, event);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          shops: shops.map(shop => ({
            shopId: shop.shopId,
            shopName: shop.shopName,
            organizationId: shop.organizationId,
            organizationName: shop.organizationName,
            role: shop.role,
            createdAt: shop.createdAt,
          })),
        },
      }),
    };

  } catch (error) {
    return handleError(error, event, 'getUserShops');
  }
};
