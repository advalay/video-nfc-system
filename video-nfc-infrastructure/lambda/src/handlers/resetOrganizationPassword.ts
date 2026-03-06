import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo, getCorsHeaders } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminResetUserPasswordCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { validateOrganizationId } from '../lib/validation';

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織管理者パスワードリセット開始', {}, event);

    const user = parseAuthUser(event);

    // 権限チェック: システム管理者のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織管理者のパスワードリセットはシステム管理者のみ実行できます');
    }

    const organizationId = event.pathParameters?.organizationId;
    if (!organizationId) {
      throw new Error('組織IDが指定されていません');
    }

    if (!validateOrganizationId(organizationId)) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ success: false, error: '組織IDの形式が不正です' }),
      };
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
    let adminEmail = '';
    
    for (const cognitoUser of listUsersResult.Users || []) {
      const getUserResult = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUser.Username!,
      }));

      // グループをチェック
      const role = getUserResult.UserAttributes?.find((attr: any) => attr.Name === 'custom:role')?.Value;

      if (role === 'organization-admin') {
        adminUser = cognitoUser;
        adminEmail = cognitoUser.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || '';
        break;
      }
    }

    if (!adminUser || !adminEmail) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: '組織管理者が見つかりません',
        }),
      };
    }

    // Cognitoでパスワードリセットを実行
    await cognitoClient.send(new AdminResetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: adminEmail,
    }));

    logInfo('組織管理者パスワードリセット成功', { organizationId, email: adminEmail }, event);

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        message: `パスワードリセットメールを ${adminEmail} に送信しました`,
        data: {
          organizationId,
          organizationName: organization.organizationName,
          email: adminEmail,
        },
      }),
    };

  } catch (error) {
    return handleError(error, event, 'resetOrganizationPassword');
  }
};

