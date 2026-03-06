import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo, getCorsHeaders } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { generateTempPassword } from '../lib/password';
import { parseBody, createShopSchema } from '../lib/validation';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('販売店作成開始', {}, event);
    
    const user = parseAuthUser(event);

    const result = parseBody(createShopSchema, event);
    if (!result.success) return result.response;
    const body = result.data;
    const { shopName, organizationId, email, contactPerson, contactEmail, contactPhone } = body;

    // 権限チェック: system-admin または organization-admin
    if (!user.groups.includes('system-admin') && !user.groups.includes('organization-admin')) {
      throw new Error('販売店の作成は管理者のみ実行できます');
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

    // 既存ユーザーが存在する場合はエラー（シンプル版）
    if (existingUser) {
      logInfo('既存ユーザーのため販売店作成を拒否', { username }, event);
      return {
        statusCode: 409,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: 'このメールアドレスは既に登録されています。別のメールアドレスをご使用ください。',
          code: 'EMAIL_ALREADY_EXISTS'
        }),
      };
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
    
    // DynamoDBトランザクション：Shop作成 + Organization更新 + UserShopRelation作成（Cognito作成の前に実行）
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
          },
          {
            Put: {
              TableName: process.env.DYNAMODB_TABLE_USER_SHOP_RELATION,
              Item: {
                userId: email, // emailをuserIdとして使用
                shopId: shopId,
                shopName: shopName,
                organizationId: organizationId,
                organizationName: organization.Item.organizationName,
                role: 'shop-admin',
                createdAt: new Date().toISOString(),
              },
              ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(shopId)', // 重複チェック
            }
          }
        ]
      }));

      logInfo('販売店データ作成成功（UserShopRelation含む）', { shopId, shopName, organizationId, userId: email }, event);

    } catch (dbError: any) {
      logInfo('DynamoDBトランザクションエラー', { error: dbError.message }, event);
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: '販売店データの保存に失敗しました'
        }),
      };
    }

    // DynamoDB成功後にCognitoユーザーを作成（シンプル版）
    try {
      // 新規ユーザー作成（招待メールをCognitoが自動送信）
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
      }));

      // ユーザーをshop-adminグループに追加
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: 'shop-admin',
      }));

      logInfo('販売店ユーザーアカウント作成成功', { username, shopId, organizationId }, event);

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

        // UserShopRelationテーブルから削除
        await dynamodb.send(new DeleteCommand({
          TableName: process.env.DYNAMODB_TABLE_USER_SHOP_RELATION,
          Key: { userId: email, shopId: shopId }
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

        logInfo('DynamoDBロールバック成功（UserShopRelation含む）', { shopId, organizationId, userId: email }, event);
      } catch (rollbackError: any) {
        logInfo('DynamoDBロールバック失敗', { error: rollbackError.message }, event);
      }
      
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: 'ユーザーアカウントの作成に失敗しました'
        }),
      };
    }

    // 成功レスポンス
    return {
      statusCode: 201,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: {
          shopId,
          shopName,
          email,
          loginUrl: process.env.LOGIN_URL || process.env.FRONTEND_URL || '',
          message: '販売店と新規ユーザーを作成しました。招待メールが送信されました。',
        },
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'createShop');
  }
};
