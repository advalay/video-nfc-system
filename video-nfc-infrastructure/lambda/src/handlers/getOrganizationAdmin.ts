import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織管理者情報取得開始', {}, event);

    const user = parseAuthUser(event);

    // 権限チェック: システム管理者のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織管理者情報の取得はシステム管理者のみ実行できます');
    }

    const organizationId = event.pathParameters?.organizationId;
    if (!organizationId) {
      throw new Error('組織IDが指定されていません');
    }

    // DynamoDBから組織情報を取得
    const orgResult = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId },
    }));

    if (!orgResult.Item) {
      throw new Error('組織が見つかりません');
    }

    const organization = orgResult.Item;

    // Cognitoから組織管理者を検索
    const listUsersResult = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `"custom:organizationId" = "${organizationId}"`,
    }));

    // organization-adminグループに属するユーザーを探す
    let adminUser = null;
    for (const cognitoUser of listUsersResult.Users || []) {
      const getUserResult = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUser.Username!,
      }));

      // グループをチェック
      const groups = getUserResult.UserAttributes?.find(attr => attr.Name === 'cognito:groups')?.Value || '';
      const role = getUserResult.UserAttributes?.find(attr => attr.Name === 'custom:role')?.Value;

      if (role === 'organization-admin' || groups.includes('organization-admin')) {
        adminUser = cognitoUser;
        break;
      }
    }

    if (!adminUser) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '組織管理者が見つかりません',
        }),
      };
    }

    const email = adminUser.Attributes?.find(attr => attr.Name === 'email')?.Value || '';
    const createdAt = adminUser.UserCreateDate?.toISOString() || '';

    logInfo('組織管理者情報取得成功', { organizationId, email }, event);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          email,
          organizationName: organization.organizationName,
          loginUrl: process.env.FRONTEND_URL || 'https://main.d3vnoskfyyh2d2.amplifyapp.com',
          createdAt,
        },
      }),
    };

  } catch (error) {
    return handleError(error, event, 'getOrganizationAdmin');
  }
};

