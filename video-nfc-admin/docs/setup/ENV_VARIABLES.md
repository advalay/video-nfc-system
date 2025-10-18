# AWS Amplify環境変数設定

## 取得済みの情報

```bash
# Cognito User Pool ID
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_gtvMJ70ot

# Cognito User Pool Client ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=6o0knadh7s8v164r6a8kvp7m0n

# Cognito Region
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# API Gateway URL (dev環境)
NEXT_PUBLIC_API_BASE_URL=https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev

# アプリケーション環境
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production
```

## AWS Amplify Consoleでの設定手順

1. **AWS Amplify Console**にアクセス
   ```
   https://console.aws.amazon.com/amplify/home?region=ap-northeast-1
   ```

2. アプリケーション選択後、**「環境変数」**タブをクリック

3. 上記の環境変数を1つずつ追加：
   - キー: `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
   - 値: `ap-northeast-1_gtvMJ70ot`
   - 「追加」をクリック

4. すべて追加後、**「保存」**をクリック

5. **「再デプロイ」**を実行して環境変数を反映

## 本番環境用の追加設定（推奨）

### 1. API Gateway CORSの更新
本番AmplifyのURLを`allowOrigins`に追加：

```bash
cd /Users/kosuke/video-nfc-infrastructure
```

`lib/api-stack.ts`を編集：
```typescript
allowOrigins: [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://main.d1ev0n2ma4sc0y.amplifyapp.com', // ← Amplify URLを追加
],
```

### 2. セキュリティグループの設定
Lambda関数がVPC内で動作する場合、セキュリティグループを確認

### 3. CloudWatch Logs
本番環境のログ保持期間を設定：
```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/getSystemStats \
  --retention-in-days 30 \
  --region ap-northeast-1
```

## トラブルシューティング

### 環境変数が反映されない
- Amplifyコンソールで再デプロイ
- ビルドログで環境変数が正しく設定されているか確認

### API接続エラー
- API Gateway URLが正しいか確認
- CORS設定を確認
- Lambda関数のログを確認

### 認証エラー
- Cognito User Pool IDとClient IDが正しいか確認
- Cognitoユーザーが作成されているか確認

