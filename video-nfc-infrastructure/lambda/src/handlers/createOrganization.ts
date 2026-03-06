import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo, getCorsHeaders } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import { generateTempPassword } from '../lib/password';
import { parseBody, createOrganizationSchema } from '../lib/validation';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('組織作成開始', {}, event);
    
    const user = parseAuthUser(event);
    
    // 権限チェック: システム管理者のみ
    if (!user.groups.includes('system-admin')) {
      throw new Error('組織の作成はシステム管理者のみ実行できます');
    }
    
    const result = parseBody(createOrganizationSchema, event);
    if (!result.success) return result.response;
    const body = result.data;

    const organizationId = `org-${body.organizationType}-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    
    const organization = {
      organizationId,
      organizationType: body.organizationType,
      organizationName: body.organizationName,
      parentId: body.parentId || null,
      level: body.organizationType === 'agency' ? 0 : 1,
      contactphone: body.contactphone || '',
      status: 'active',
      unitPrice: body.unitPrice || 1200,
      totalVideos: 0,
      totalStorage: 0,
      contractDate: now,
      createdAt: now,
      updatedAt: now,
    };
    
    await dynamodb.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Item: organization,
    }));
    
    // 組織管理者ユーザーを作成
    let email = '';

    if (body.email) {
      email = body.email;
      const tempPassword = generateTempPassword();
      const username = email;

      try {
        // Cognitoユーザー作成（招待メールをCognitoが自動送信）
        await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:organizationId', Value: organizationId },
            { Name: 'custom:organizationName', Value: body.organizationName },
            { Name: 'custom:role', Value: 'organization-admin' },
          ],
          TemporaryPassword: tempPassword,
        }));

        // ユーザーをorganization-adminグループに追加
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: 'organization-admin',
        }));

        logInfo('組織管理者ユーザー作成成功', { email, organizationId }, event);
      } catch (cognitoError: any) {
        logInfo('Cognitoユーザー作成失敗', { error: cognitoError.message }, event);
        // Cognito作成失敗は警告として記録するが、組織作成は成功とする
      }
    }
    
    logInfo('組織作成成功', { organizationId, organizationType: body.organizationType }, event);
    
    return {
      statusCode: 201,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: {
          ...organization,
          email,
          message: email ? '招待メールが送信されました。メールに記載された仮パスワードでログインしてください。' : undefined,
        },
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createOrganization');
  }
};
