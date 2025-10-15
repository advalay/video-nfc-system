#!/bin/bash

# CORS修正のデプロイスクリプト
# シニアエンジニア向けの包括的な修正デプロイ

set -e

echo "🚀 CORS修正のデプロイを開始します..."

# 1. Lambda関数のビルドとデプロイ
echo "📦 Lambda関数をビルドしています..."
cd lambda
npm run build

echo "📤 getSystemStats Lambda関数をデプロイしています..."
cd dist/handlers
zip -r getSystemStats-cors-fix.zip getSystemStats.js
aws lambda update-function-code \
  --function-name getSystemStats \
  --zip-file fileb://getSystemStats-cors-fix.zip

echo "✅ Lambda関数のデプロイが完了しました"

# 2. CDKスタックのデプロイ
echo "🏗️ CDKスタックをデプロイしています..."
cd ../../..
npm run build
cdk deploy VideoNfcApiStack-dev --require-approval never

echo "✅ CDKスタックのデプロイが完了しました"

# 3. API Gatewayの強制デプロイ
echo "🔄 API Gatewayを強制デプロイしています..."
aws apigateway create-deployment \
  --rest-api-id ujwli7k2ti \
  --stage-name dev \
  --description "CORS修正デプロイ - $(date)"

echo "✅ API Gatewayのデプロイが完了しました"

# 4. 動作確認
echo "🧪 動作確認を実行しています..."
API_URL="https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev/system/stats"

echo "OPTIONS リクエストのテスト:"
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v "$API_URL"

echo ""
echo "🎉 CORS修正のデプロイが完了しました！"
echo "📋 次のステップ:"
echo "1. フロントエンドを再起動してください"
echo "2. ブラウザのキャッシュをクリアしてください"
echo "3. システム統計ページで動作確認してください"

