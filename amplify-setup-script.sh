#!/bin/bash

# AWS Amplify アプリケーションのセットアップスクリプト
#
# 使い方:
# 1. AWSコンソールでAmplifyアプリを作成し、APP_IDを取得
# 2. このスクリプトのAPP_ID変数を更新
# 3. ./amplify-setup-script.sh を実行

# ================================
# 設定値（要変更）
# ================================
APP_ID="YOUR_APP_ID_HERE"  # AWSコンソールで作成後、ここに入力
REGION="ap-northeast-1"

# ================================
# 環境変数（現在の値）
# ================================
API_URL="https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev"
USER_POOL_ID="ap-northeast-1_gtvMJ70ot"
CLIENT_ID="6u6eqm9jqhc0vdvhfvto7ji3gg"
AWS_REGION="ap-northeast-1"

echo "========================================="
echo "AWS Amplify セットアップスクリプト"
echo "========================================="
echo ""

# APP_IDのチェック
if [ "$APP_ID" = "YOUR_APP_ID_HERE" ]; then
  echo "❌ エラー: APP_IDが設定されていません"
  echo ""
  echo "手順:"
  echo "1. AWS Amplifyコンソールでアプリを作成"
  echo "2. アプリIDをコピー（例: d1234567890abcd）"
  echo "3. このスクリプトのAPP_ID変数を更新"
  echo ""
  echo "または、以下のコマンドで直接指定:"
  echo "APP_ID=your-app-id ./amplify-setup-script.sh"
  exit 1
fi

echo "📋 設定内容:"
echo "  APP_ID: $APP_ID"
echo "  REGION: $REGION"
echo "  API_URL: $API_URL"
echo "  USER_POOL_ID: $USER_POOL_ID"
echo ""

read -p "この設定で環境変数を設定しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "キャンセルしました"
  exit 0
fi

echo ""
echo "🔧 環境変数を設定中..."

# 環境変数を設定
aws amplify update-app \
  --app-id "$APP_ID" \
  --environment-variables \
    NEXT_PUBLIC_API_URL="$API_URL" \
    NEXT_PUBLIC_USER_POOL_ID="$USER_POOL_ID" \
    NEXT_PUBLIC_USER_POOL_CLIENT_ID="$CLIENT_ID" \
    NEXT_PUBLIC_AWS_REGION="$AWS_REGION" \
  --region "$REGION"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 環境変数の設定が完了しました！"
  echo ""
  echo "次のステップ:"
  echo "1. AWS Amplifyコンソールで環境変数を確認"
  echo "2. ビルドを手動で開始、または次回のGitプッシュで自動ビルド"
  echo "3. ビルド完了後、デプロイされたURLにアクセス"
  echo ""
  echo "📱 アプリURL: https://main.$APP_ID.amplifyapp.com"
else
  echo ""
  echo "❌ エラー: 環境変数の設定に失敗しました"
  echo "AWSの認証情報とAPP_IDを確認してください"
  exit 1
fi
