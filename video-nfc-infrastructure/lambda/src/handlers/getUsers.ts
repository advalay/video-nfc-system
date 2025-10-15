import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const USER_POOL_ID = process.env.USER_POOL_ID;
const DYNAMODB_TABLE_ORGANIZATION = process.env.DYNAMODB_TABLE_ORGANIZATION;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('Getting users list', { event }, event);

    // 認証チェック
    const user = parseAuthUser(event);
    if (!user.groups?.includes('system-admin')) {
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
            message: 'システム管理者のみアクセス可能です',
          },
        }),
      };
    }

    if (!USER_POOL_ID) {
      throw new Error('USER_POOL_ID environment variable is not set');
    }

    // Cognitoからユーザー一覧を取得
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60, // 最大60ユーザー
    });

    const cognitoUsers = await cognito.send(listUsersCommand);
    
    if (!cognitoUsers.Users) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          data: {
            users: [],
          },
        }),
      };
    }

    // 組織情報を取得
    let organizations: any[] = [];
    if (DYNAMODB_TABLE_ORGANIZATION) {
      try {
        const orgScanCommand = new ScanCommand({
          TableName: DYNAMODB_TABLE_ORGANIZATION,
        });
        const orgResult = await dynamodb.send(orgScanCommand);
        organizations = orgResult.Items || [];
      } catch (error) {
        console.warn('Failed to fetch organizations:', error);
      }
    }

    // ユーザー情報を整形
    const users = await Promise.all(
      cognitoUsers.Users.map(async (cognitoUser) => {
        // カスタム属性を取得
        const attributes = cognitoUser.Attributes || [];
        const emailAttr = attributes.find(attr => attr.Name === 'email');
        const organizationIdAttr = attributes.find(attr => attr.Name === 'custom:organizationId');
        const shopIdAttr = attributes.find(attr => attr.Name === 'custom:shopId');
        const roleAttr = attributes.find(attr => attr.Name === 'custom:role');
        
        const email = emailAttr?.Value || '';
        const organizationId = organizationIdAttr?.Value || '';
        const shopId = shopIdAttr?.Value || '';
        const role = roleAttr?.Value || 'user';

        // 組織名を取得
        const organization = organizations.find(org => 
          org.organizationId?.S === organizationId
        );
        const organizationName = organization?.organizationName?.S || '';

        // 販売店名を取得（販売店ユーザーの場合）
        let shopName = '';
        if (shopId && organization?.shops?.L) {
          const shop = organization.shops.L.find((shopItem: any) => 
            shopItem.M?.shopId?.S === shopId
          );
          shopName = shop?.M?.shopName?.S || '';
        }

        // ステータスを判定
        const status = cognitoUser.UserStatus === 'CONFIRMED' ? 'active' : 'inactive';

        // 最終ログイン日時を取得
        let lastLogin: string | undefined;
        if (cognitoUser.UserLastModifiedDate) {
          lastLogin = cognitoUser.UserLastModifiedDate.toISOString();
        }

        return {
          userId: cognitoUser.Username || '',
          email,
          role,
          organizationId,
          organizationName,
          shopId: shopId || undefined,
          shopName: shopName || undefined,
          status,
          createdAt: cognitoUser.UserCreateDate?.toISOString() || new Date().toISOString(),
          lastLogin,
        };
      })
    );

    // ユーザーをメールアドレス順でソート
    users.sort((a, b) => a.email.localeCompare(b.email));

    logInfo('Users list retrieved successfully', { 
      userCount: users.length,
      userId: user.userId 
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
          users,
        },
      }),
    };

  } catch (error) {
    return handleError(error, event, 'getUsers');
  }
};




