#!/bin/bash

# テストアカウントをCognitoとDynamoDBに登録するスクリプト
# 使用方法: ./scripts/setup-test-accounts.sh

set -e

# 環境変数の設定
USER_POOL_ID="ap-northeast-1_gtvMJ70ot"
REGION="ap-northeast-1"
ORGANIZATION_TABLE="video-nfc-Organization-dev"
SHOP_TABLE="video-nfc-Shop-dev"

echo "🚀 テストアカウントのセットアップを開始します..."
echo "User Pool ID: $USER_POOL_ID"
echo "Region: $REGION"
echo ""

# システム管理者アカウント作成
echo "📝 1. システム管理者アカウントを作成中..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username system-admin@example.com \
  --user-attributes \
    Name=email,Value=system-admin@example.com \
    Name=email_verified,Value=true \
    Name=custom:organizationId,Value=SYSTEM \
    Name=custom:organizationName,Value=システム管理 \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region $REGION || echo "  ⚠️  ユーザーは既に存在します"

# パスワードを永続的に設定
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username system-admin@example.com \
  --password "AdminPass123!" \
  --permanent \
  --region $REGION || echo "  ⚠️  パスワード設定に失敗しました"

# グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username system-admin@example.com \
  --group-name system-admin \
  --region $REGION || echo "  ⚠️  グループへの追加に失敗しました"

echo "✅ システム管理者アカウント作成完了"
echo ""

# パートナー企業Aの組織管理者アカウント作成
echo "📝 2. パートナー企業A 組織管理者アカウントを作成中..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username orga-admin@example.com \
  --user-attributes \
    Name=email,Value=orga-admin@example.com \
    Name=email_verified,Value=true \
    Name=custom:organizationId,Value=ORG_A \
    Name=custom:organizationName,Value=パートナー企業A \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region $REGION || echo "  ⚠️  ユーザーは既に存在します"

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username orga-admin@example.com \
  --password "OrgAPass123!" \
  --permanent \
  --region $REGION || echo "  ⚠️  パスワード設定に失敗しました"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username orga-admin@example.com \
  --group-name organization-admin \
  --region $REGION || echo "  ⚠️  グループへの追加に失敗しました"

echo "✅ パートナー企業A 組織管理者アカウント作成完了"
echo ""

# 販売店A1ユーザーアカウント作成
echo "📝 3. 販売店A1ユーザーアカウントを作成中..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username shop-a1@example.com \
  --user-attributes \
    Name=email,Value=shop-a1@example.com \
    Name=email_verified,Value=true \
    Name=custom:organizationId,Value=ORG_A \
    Name=custom:shopId,Value=SHOP_A1 \
    Name=custom:organizationName,Value=パートナー企業A \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region $REGION || echo "  ⚠️  ユーザーは既に存在します"

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username shop-a1@example.com \
  --password "ShopA1Pass123!" \
  --permanent \
  --region $REGION || echo "  ⚠️  パスワード設定に失敗しました"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username shop-a1@example.com \
  --group-name shop-user \
  --region $REGION || echo "  ⚠️  グループへの追加に失敗しました"

echo "✅ 販売店A1ユーザーアカウント作成完了"
echo ""

# DynamoDBに組織データを登録
echo "📝 4. DynamoDB組織データを登録中..."
aws dynamodb put-item \
  --table-name $ORGANIZATION_TABLE \
  --item '{
    "organizationId": {"S": "ORG_A"},
    "organizationName": {"S": "パートナー企業A"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},
    "status": {"S": "active"}
  }' \
  --region $REGION || echo "  ⚠️  組織データの登録に失敗しました"

echo "✅ 組織データ登録完了"
echo ""

# DynamoDBに販売店データを登録
echo "📝 5. DynamoDB販売店データを登録中..."
aws dynamodb put-item \
  --table-name $SHOP_TABLE \
  --item '{
    "shopId": {"S": "SHOP_A1"},
    "organizationId": {"S": "ORG_A"},
    "shopName": {"S": "販売店A1"},
    "email": {"S": "shop-a1@example.com"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},
    "status": {"S": "active"}
  }' \
  --region $REGION || echo "  ⚠️  販売店データの登録に失敗しました"

echo "✅ 販売店データ登録完了"
echo ""

echo "🎉 テストアカウントのセットアップが完了しました！"
echo ""
echo "📋 作成されたアカウント:"
echo "  1. システム管理者: system-admin@example.com / AdminPass123!"
echo "  2. パートナー企業A: orga-admin@example.com / OrgAPass123!"
echo "  3. 販売店A1: shop-a1@example.com / ShopA1Pass123!"
echo ""
echo "💡 これらのアカウントでログインしてテストできます。"

