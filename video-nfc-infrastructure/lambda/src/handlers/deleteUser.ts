import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand, AdminDisableUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const USER_POOL_ID = process.env.USER_POOL_ID;

interface DeleteUserRequest {
  userId: string;
  action: 'delete' | 'disable'; // 削除または無効化
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('Deleting/disabling user', { event }, event);

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
    const { userId, action }: DeleteUserRequest = body;

    // バリデーション
    if (!userId || !action) {
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
            message: 'ユーザーIDとアクションは必須です',
          },
        }),
      };
    }

    // 自分自身の削除を防止
    if (userId === user.userId) {
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
            message: '自分自身のアカウントは削除できません',
          },
        }),
      };
    }

    if (action === 'delete') {
      // ユーザーを完全削除
      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      });

      await cognito.send(deleteUserCommand);

      logInfo('User deleted successfully', { 
        userId, 
        adminUserId: user.userId 
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
            message: 'ユーザーが削除されました',
            action: 'delete',
          },
        }),
      };

    } else if (action === 'disable') {
      // ユーザーを無効化
      const disableUserCommand = new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      });

      await cognito.send(disableUserCommand);

      logInfo('User disabled successfully', { 
        userId, 
        adminUserId: user.userId 
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
            message: 'ユーザーが無効化されました',
            action: 'disable',
          },
        }),
      };

    } else {
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
            message: '無効なアクションです。delete または disable を指定してください',
          },
        }),
      };
    }

  } catch (error) {
    return handleError(error, event, 'deleteUser');
  }
};




