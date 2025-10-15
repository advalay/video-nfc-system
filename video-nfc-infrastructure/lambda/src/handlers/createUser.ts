import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const USER_POOL_ID = process.env.USER_POOL_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

interface CreateUserRequest {
  email: string;
  role: 'system-admin' | 'organization-admin' | 'shop-user';
  organizationId: string;
  shopId?: string;
  temporaryPassword?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('Creating new user', { event }, event);

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

    const body = JSON.parse(event.body || '{}');
    const { email, role, organizationId, shopId, temporaryPassword }: CreateUserRequest = body;

    // バリデーション
    if (!email || !role || !organizationId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'メールアドレス、役割、組織IDは必須です',
          },
        }),
      };
    }

    // 販売店ユーザーの場合、shopIdが必要
    if (role === 'shop-user' && !shopId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: '販売店ユーザーの場合、店舗IDは必須です',
          },
        }),
      };
    }

    // 一時パスワードを生成（指定されていない場合）
    const tempPassword = temporaryPassword || generateTemporaryPassword();

    // Cognitoでユーザーを作成
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:organizationId', Value: organizationId },
        { Name: 'custom:role', Value: role },
        ...(shopId ? [{ Name: 'custom:shopId', Value: shopId }] : []),
      ],
      TemporaryPassword: tempPassword,
      MessageAction: 'SUPPRESS', // 自動送信を抑制
    });

    const createUserResult = await cognito.send(createUserCommand);

    // パスワードを設定
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: tempPassword,
      Permanent: false, // 初回ログイン時に変更が必要
    });

    await cognito.send(setPasswordCommand);

    // ユーザーをグループに追加
    const groupName = getGroupName(role);
    if (groupName) {
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: groupName,
      });

      await cognito.send(addToGroupCommand);
    }

    logInfo('User created successfully', { 
      email, 
      role, 
      organizationId, 
      shopId,
      userId: user.userId 
    }, event);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            userId: createUserResult.User?.Username,
            email,
            role,
            organizationId,
            shopId,
            status: 'active',
            temporaryPassword: tempPassword,
          },
        },
      }),
    };

  } catch (error) {
    return handleError(error, event, 'createUser');
  }
};

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // 大文字、小文字、数字、記号を最低1文字ずつ含む
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // 残りをランダムに生成（合計12文字）
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getGroupName(role: string): string | null {
  switch (role) {
    case 'system-admin':
      return 'system-admin';
    case 'organization-admin':
      return 'organization-admin';
    case 'shop-user':
      return 'shop-user';
    default:
      return null;
  }
}




