# CORS問題のトラブルシューティングガイド

## 🚨 問題の概要

フロントエンド（`http://localhost:3000`）からAPI Gateway（`https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev/system/stats`）へのリクエストがCORSエラーでブロックされる問題。

## 🔍 根本原因

1. **API Gateway の CORS 設定不備**
2. **Lambda統合でのヘッダー伝播問題**
3. **開発環境のオリジン設定不足**

## ✅ 実装した修正

### 1. CDKスタックの修正

#### CORS設定の強化
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://*.amazonaws.com',
    'https://*.cloudfront.net',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Development-Mode',
  ],
  allowCredentials: true,
  maxAge: cdk.Duration.days(10),
}
```

#### Lambda統合の改善
```typescript
const lambdaIntegrationOptions: apigateway.LambdaIntegrationOptions = {
  proxy: true,
  allowTestInvoke: true,
  timeout: cdk.Duration.seconds(29),
  requestParameters: {
    'integration.request.header.Access-Control-Allow-Origin': "'*'",
    'integration.request.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode'",
    'integration.request.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
  },
  integrationResponses: [
    {
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    },
  ],
};
```

#### 明示的なOPTIONS メソッド追加
```typescript
systemStatsResource.addMethod(
  'OPTIONS',
  new apigateway.MockIntegration({
    integrationResponses: [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
        },
      },
    ],
    requestTemplates: {
      'application/json': '{"statusCode": 200}',
    },
  }),
  // ... method responses
);
```

### 2. Lambda関数の修正

#### CORS ヘッダーの強化
```javascript
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
};
```

## 🚀 デプロイ手順

### 自動デプロイ
```bash
./deploy-cors-fix.sh
```

### 手動デプロイ
```bash
# 1. Lambda関数のデプロイ
cd lambda
npm run build
cd dist/handlers
zip -r getSystemStats-cors-fix.zip getSystemStats.js
aws lambda update-function-code \
  --function-name getSystemStats \
  --zip-file fileb://getSystemStats-cors-fix.zip

# 2. CDKスタックのデプロイ
cd ../../..
npm run build
cdk deploy VideoNfcApiStack-dev --require-approval never

# 3. API Gatewayの強制デプロイ
aws apigateway create-deployment \
  --rest-api-id ujwli7k2ti \
  --stage-name dev \
  --description "CORS修正デプロイ"
```

## 🧪 動作確認

### 1. OPTIONS リクエストのテスト
```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v "https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev/system/stats"
```

期待されるレスポンス:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode
Access-Control-Allow-Methods: GET,OPTIONS
```

### 2. GET リクエストのテスト
```bash
curl -X GET \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v "https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev/system/stats"
```

## 🔧 トラブルシューティング

### 問題1: まだCORSエラーが発生する

**原因**: ブラウザキャッシュまたはAPI Gatewayキャッシュ
**解決策**:
1. ブラウザのキャッシュをクリア
2. ハードリフレッシュ（Ctrl+Shift+R）
3. API Gatewayのキャッシュを無効化

### 問題2: OPTIONS リクエストが404エラー

**原因**: OPTIONS メソッドが正しく設定されていない
**解決策**:
1. API Gateway コンソールで `/system/stats` リソースを確認
2. OPTIONS メソッドが存在することを確認
3. 必要に応じて手動で追加

### 問題3: 認証エラーが発生する

**原因**: 認証トークンまたは権限の問題
**解決策**:
1. 認証トークンが有効か確認
2. system-admin グループに属しているか確認
3. 開発環境では `X-Development-Mode: true` ヘッダーを使用

## 📋 確認項目

- [ ] API Gateway の CORS 設定が更新されている
- [ ] Lambda関数が最新バージョンにデプロイされている
- [ ] OPTIONS メソッドが `/system/stats` に存在する
- [ ] フロントエンドの環境変数が正しく設定されている
- [ ] ブラウザのキャッシュがクリアされている

## 🎯 次のステップ

1. **パフォーマンス監視**: API Gateway のログとメトリクスを監視
2. **セキュリティ強化**: 本番環境では具体的なオリジンを指定
3. **エラーハンドリング**: より詳細なエラーメッセージの実装
4. **テスト自動化**: CORS設定の自動テストの追加

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. AWS CloudWatch ログの確認
2. API Gateway の実行ログの確認
3. ブラウザの開発者ツールでのネットワークタブの確認
4. Lambda関数の実行ログの確認

