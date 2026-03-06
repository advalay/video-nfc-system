import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo, getCorsHeaders } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import { generateTempPassword } from '../lib/password';
import { parseBody, createOrganizationWithUserSchema } from '../lib/validation';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織・ユーザー作成開始', {}, event);
    
    const user = parseAuthUser(event);
    
    // 権限チェック: システム管理者のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織の作成はシステム管理者のみ実行できます');
    }
    
    const result = parseBody(createOrganizationWithUserSchema, event);
    if (!result.success) return result.response;
    const body = result.data;

    const organizationId = `org-${body.organizationType}-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    
    // 1. Cognitoユーザーアカウントを作成
    const tempPassword = generateTempPassword();
    const username = body.email; // メールアドレスをユーザー名として使用
    
    try {
      // ユーザー作成（招待メールをCognitoが自動送信）
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: [
          { Name: 'email', Value: body.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:organizationId', Value: organizationId },
          { Name: 'custom:shopId', Value: body.organizationType === 'store' ? organizationId : '' },
          { Name: 'custom:role', Value: body.organizationType === 'agency' ? 'organization-admin' : 'shop-admin' },
        ],
        TemporaryPassword: tempPassword,
      }));

      // ユーザーをグループに追加
      const groupName = body.organizationType === 'agency' ? 'organization-admin' : 'shop-admin';
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName,
      }));

      logInfo('ユーザーアカウント作成成功', { username, organizationId, groupName }, event);

    } catch (cognitoError: any) {
      logInfo('Cognitoユーザー作成エラー', { error: cognitoError.message }, event);
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: 'ユーザーアカウントの作成に失敗しました'
        }),
      };
    }
    
    // 2. 組織情報をDynamoDBに保存
    const organization = {
      organizationId,
      organizationType: body.organizationType,
      organizationName: body.organizationName,
      parentId: body.parentId || null,
      level: body.organizationType === 'agency' ? 0 : 1,
      email: body.email,
      phone: body.phone || '',
      address: body.address || '',
      status: 'active',
      unitPrice: body.unitPrice || 1200,
      totalVideos: 0,
      totalStorage: 0,
      shops: [],
      contractDate: now,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      await dynamodb.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        Item: organization,
      }));

      logInfo('組織作成成功', { organizationId, organizationType: body.organizationType }, event);

    } catch (dbError: any) {
      logInfo('DynamoDB組織作成エラー', { error: dbError.message }, event);
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: '組織データの保存に失敗しました'
        }),
      };
    }
    
    logInfo('組織・ユーザー作成完了', { organizationId, organizationType: body.organizationType, username: body.email }, event);
    
    return {
      statusCode: 201,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: {
          organization,
          userAccount: {
            email: body.email,
            role: body.organizationType === 'agency' ? 'organization-admin' : 'shop-admin',
            message: '招待メールが送信されました。メールに記載された仮パスワードでログインしてください。',
          },
        },
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createOrganizationWithUser');
  }
};
