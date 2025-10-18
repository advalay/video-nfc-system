import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('販売店作成開始', {}, event);
    
    const user = parseAuthUser(event);
    const body = JSON.parse(event.body || '{}');
    
    // 権限チェック: system-admin または organization-admin
    if (!user.groups.includes('system-admin') && !user.groups.includes('organization-admin')) {
      throw new Error('販売店の作成は管理者のみ実行できます');
    }
    
    // 必須フィールドの検証
    const { shopName, organizationId, email, contactPerson, contactEmail, contactPhone } = body;
    
    if (!shopName || !organizationId || !email || !contactPerson) {
      throw new Error('shopName, organizationId, email, contactPerson は必須です');
    }
    
    // organization-adminの場合のみ、自社の販売店のみ作成可能
    if (user.groups.includes('organization-admin') && user.organizationId !== organizationId) {
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
      email, // 管理者メールアドレス
      contactPerson, // 担当者名
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
    
    // Cognitoユーザーアカウントを作成
    const tempPassword = generateTempPassword();
    const username = email; // メールアドレスをユーザー名として使用
    
    try {
      // ユーザー作成
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:shopId', Value: shopId },
          { Name: 'custom:organizationId', Value: organizationId },
          { Name: 'custom:shopName', Value: shopName },
          { Name: 'custom:role', Value: 'shop-admin' },
        ],
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS', // メール送信を抑制
      }));

      // ユーザーをshop-adminグループに追加
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: 'shop-admin',
      }));

      // パスワードを永続化（初回ログイン時に変更を強制しない）
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: tempPassword,
        Permanent: true,
      }));

      logInfo('販売店ユーザーアカウント作成成功', { username, shopId, organizationId }, event);

    } catch (cognitoError: any) {
      logInfo('Cognitoユーザー作成エラー', { error: cognitoError.message }, event);
      // 販売店は作成済みなので、エラーを返す
      throw new Error(`販売店は作成されましたが、ユーザーアカウントの作成に失敗しました: ${cognitoError.message}`);
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
        shopId,
        shopName,
        email,
        tempPassword,
        loginUrl: process.env.LOGIN_URL || 'https://your-app.com/login',
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createShop');
  }
};

// 一時パスワード生成
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // 大文字、小文字、数字、記号を最低1つずつ含む
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // 残り8文字をランダムに生成
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // 文字列をシャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
