import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand, AdminGetUserCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { generateTempPassword } from '../lib/password';

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
    
    // 組織の存在確認
    logInfo('組織の存在確認', { organizationId }, event);
    const organization = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      Key: { organizationId }
    }));
    
    if (!organization.Item) {
      throw new Error(`組織ID ${organizationId} が見つかりません`);
    }
    
    // 販売店IDを生成（SHOP_組織ID_連番）
    const timestamp = Date.now();
    const shopId = `SHOP_${organizationId}_${timestamp}`;
    
    // 既存メールアドレスの確認（Cognito作成前にチェック）
    const tempPassword = generateTempPassword();
    const username = email; // メールアドレスをユーザー名として使用

    // 既存ユーザーの確認
    let existingUser = null;
    try {
      const getUserResult = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }));
      existingUser = getUserResult;
      logInfo('既存ユーザーを発見', { username }, event);
    } catch (error: any) {
      if (error.name !== 'UserNotFoundException') {
        // UserNotFoundException以外のエラーは予期しないエラー
        throw error;
      }
      // UserNotFoundExceptionの場合は新規ユーザーとして続行
      logInfo('新規ユーザーとして作成', { username }, event);
    }

    // 既存ユーザーが存在する場合の処理
    if (existingUser) {
      // ユーザーのグループを取得
      const userAttributes = existingUser.UserAttributes || [];
      const userGroups = userAttributes.find(attr => attr.Name === 'custom:groups')?.Value || '';

      // すでにshop-adminグループに所属している場合はエラー
      if (userGroups.includes('shop-admin')) {
        return {
          statusCode: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'このユーザーは既に販売店管理者として登録されています',
            code: 'ALREADY_SHOP_ADMIN'
          }),
        };
      }

      // organization-adminの場合は、shop-adminグループを追加
      // （マルチロール対応：組織管理者が販売店管理者も兼務できるようにする）
      if (userGroups.includes('organization-admin')) {
        logInfo('既存の組織管理者に販売店管理者権限を追加', { email, shopId }, event);

        // この後、DynamoDB処理とCognitoグループ追加処理を実行
        // （existingUserフラグによって処理が分岐する）
      } else {
        // organization-admin でも shop-admin でもない場合はエラー
        return {
          statusCode: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'このメールアドレスは既に別の役割で登録されています',
            code: 'EMAIL_ALREADY_EXISTS'
          }),
        };
      }
    }
    
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
    
    // DynamoDBトランザクション：Shop作成 + Organization更新（Cognito作成の前に実行）
    try {
      await dynamodb.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.DYNAMODB_TABLE_SHOP,
              Item: shopData,
              ConditionExpression: 'attribute_not_exists(shopId)', // 重複チェック
            }
          },
          {
            Update: {
              TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
              Key: { organizationId },
              UpdateExpression: 'SET shops = list_append(if_not_exists(shops, :empty_list), :new_shop), updatedAt = :updatedAt',
              ExpressionAttributeValues: {
                ':new_shop': [{
                  id: shopId,
                  name: shopName,
                  email: contactEmail || '',
                  status: 'active'
                }],
                ':empty_list': [],
                ':updatedAt': new Date().toISOString()
              },
              ConditionExpression: 'attribute_exists(organizationId)' // 組織の存在を再確認
            }
          }
        ]
      }));

      logInfo('販売店データ作成成功', { shopId, shopName, organizationId }, event);

    } catch (dbError: any) {
      logInfo('DynamoDBトランザクションエラー', { error: dbError.message }, event);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: '販売店データの保存に失敗しました',
          details: dbError.message
        }),
      };
    }

    // DynamoDB成功後にCognitoユーザーを作成または更新
    try {
      if (existingUser) {
        // 既存ユーザー（組織管理者）に販売店管理者権限を追加
        logInfo('既存ユーザーに販売店管理者権限を追加開始', { username, shopId }, event);

        // shop-adminグループに追加
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: 'shop-admin',
        }));

        // shopId属性を更新
        await cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          UserAttributes: [
            { Name: 'custom:shopId', Value: shopId },
            { Name: 'custom:shopName', Value: shopName },
          ],
        }));

        logInfo('既存ユーザーに販売店管理者権限を追加成功', { username, shopId, organizationId }, event);

      } else {
        // 新規ユーザー作成
        await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:shopId', Value: shopId },
            { Name: 'custom:organizationId', Value: organizationId },
            { Name: 'custom:shopName', Value: shopName },
            { Name: 'custom:organizationName', Value: organization.Item.organizationName },
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
      }

    } catch (cognitoError: any) {
      logInfo('Cognitoユーザー作成エラー', { error: cognitoError.message }, event);
      
      // Cognito作成失敗時は作成したShopデータを削除（ロールバック）
      try {
        const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
        
        // Shopテーブルから削除
        await dynamodb.send(new DeleteCommand({
          TableName: process.env.DYNAMODB_TABLE_SHOP,
          Key: { shopId }
        }));
        
        // Organizationテーブルのshops配列から削除（複雑なため、UpdateExpressionで対応）
        // 注: list_append で追加したばかりなので、配列の最後の要素を削除
        await dynamodb.send(new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
                Key: { organizationId },
                UpdateExpression: 'REMOVE shops[#lastIndex]',
                ExpressionAttributeNames: {
                  '#lastIndex': String((organization.Item.shops?.length || 0))
                },
                ConditionExpression: 'attribute_exists(organizationId)'
              }
            }
          ]
        }));
        
        logInfo('DynamoDBロールバック成功', { shopId, organizationId }, event);
      } catch (rollbackError: any) {
        logInfo('DynamoDBロールバック失敗', { error: rollbackError.message }, event);
      }
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'ユーザーアカウントの作成に失敗しました',
          details: cognitoError.message
        }),
      };
    }

    // 成功レスポンス
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          shopId,
          shopName,
          email,
          tempPassword: existingUser ? undefined : tempPassword, // 既存ユーザーの場合はパスワードを返さない
          loginUrl: process.env.LOGIN_URL || 'https://your-app.com/login',
          isExistingUser: !!existingUser, // 既存ユーザーかどうかのフラグ
          message: existingUser
            ? '既存の組織管理者に販売店管理者権限を追加しました'
            : '販売店と新規ユーザーを作成しました',
        },
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createShop');
  }
};
