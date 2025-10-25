import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminResetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

interface User {
  groups: string[];
  organizationId?: string;
  shopId?: string;
}

function parseUser(event: APIGatewayProxyEvent): User {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims) {
    throw new Error('認証情報が取得できません');
  }

  const groups = claims['cognito:groups'] ? claims['cognito:groups'].split(',') : [];
  const organizationId = claims['custom:organizationId'];
  const shopId = claims['custom:shopId'];

  return { groups, organizationId, shopId };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // パスパラメータからshopIdを取得
    const shopId = event.pathParameters?.shopId;
    if (!shopId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'shopIdが指定されていません',
        }),
      };
    }

    // ユーザー情報を取得
    const user = parseUser(event);
    console.log('User:', user);

    // 権限チェック: system-admin または organization-admin
    const isSystemAdmin = user.groups.includes('system-admin');
    const isOrganizationAdmin = user.groups.includes('organization-admin');

    if (!isSystemAdmin && !isOrganizationAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'パスワードリセットは管理者のみ実行できます',
        }),
      };
    }

    // DynamoDBから販売店情報を取得
    const shopResult = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_SHOP,
      Key: { shopId },
    }));

    if (!shopResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '販売店が見つかりません',
        }),
      };
    }

    const shop = shopResult.Item;

    // 組織管理者の場合、自組織の販売店のみ操作可能
    if (isOrganizationAdmin && shop.organizationId !== user.organizationId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '他組織の販売店のパスワードリセットは実行できません',
        }),
      };
    }

    // メールアドレスの検証
    if (!shop.email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '販売店のメールアドレスが登録されていません',
        }),
      };
    }

    console.log('Resetting password for user:', shop.email);

    // Cognitoでパスワードリセットを実行
    await cognitoClient.send(new AdminResetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: shop.email,
    }));

    console.log('Password reset email sent successfully to:', shop.email);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: `パスワードリセットメールを ${shop.email} に送信しました`,
        data: {
          shopId: shop.shopId,
          shopName: shop.shopName,
          email: shop.email,
        },
      }),
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);

    // Cognitoエラーの場合
    if (error.name === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'ユーザーが見つかりません',
        }),
      };
    }

    if (error.name === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '無効なパラメータです',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'パスワードリセットに失敗しました',
      }),
    };
  }
};

