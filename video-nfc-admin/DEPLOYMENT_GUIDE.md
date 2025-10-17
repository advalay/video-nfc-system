# 本番デプロイガイド

## AWS Amplify Hostingでのデプロイ手順

### 1. AWS Amplify Consoleにアクセス
```
https://console.aws.amazon.com/amplify/home?region=ap-northeast-1
```

### 2. 新しいアプリケーションをホスト

1. **「新しいアプリ」→「Webアプリをホスト」**をクリック
2. **GitHubを選択**し、認証
3. **リポジトリ**: `company-search-system`を選択
4. **ブランチ**: `main`を選択
5. **モノレポ設定**:
   - ルートディレクトリ: `video-nfc-admin`

### 3. ビルド設定の確認

`amplify.yml`が自動検出されます：
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 4. 環境変数の設定

**「環境変数」タブ**で以下を追加：

```bash
# AWS Cognito設定
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# API Gateway設定
NEXT_PUBLIC_API_BASE_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod

# アプリケーション設定
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production
```

**重要な環境変数の取得方法**:

#### Cognito User Pool ID
```bash
aws cognito-idp list-user-pools --max-results 10 --region ap-northeast-1 | grep -A 2 "VideoNfc"
```

#### Cognito User Pool Client ID
```bash
aws cognito-idp list-user-pool-clients \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --region ap-northeast-1
```

#### API Gateway URL
```bash
aws apigateway get-rest-apis --region ap-northeast-1 | grep -A 5 "video-nfc"
```
または
```bash
cd ../video-nfc-infrastructure
aws cloudformation describe-stacks \
  --stack-name VideoNfcApiStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### 5. デプロイの実行

1. **「保存してデプロイ」**をクリック
2. デプロイプロセスを監視（約5-10分）
3. 完了後、自動生成されたURLでアクセス可能

### 6. カスタムドメインの設定（オプション）

1. **「ドメイン管理」**タブ
2. **「ドメインを追加」**をクリック
3. Route 53またはサードパーティドメインを設定
4. SSL証明書が自動発行される

### 7. 本番環境の確認

デプロイ後、以下を確認：

- ✅ ログインページが表示される
- ✅ Cognito認証が動作する
- ✅ API Gatewayとの通信が成功する
- ✅ 動画アップロード機能が動作する
- ✅ 管理画面が正常に表示される

### トラブルシューティング

#### ビルドエラーが発生する場合
```bash
# ローカルで本番ビルドを確認
NODE_ENV=production npm run build
```

#### 環境変数が反映されない場合
1. Amplifyコンソールで環境変数を再確認
2. **「再デプロイ」**を実行

#### CORS エラーが発生する場合
API Gatewayの設定を確認：
```bash
cd ../video-nfc-infrastructure
# AmplifyのドメインをallowOriginsに追加
```

## CI/CDパイプライン

GitHubにプッシュすると自動デプロイされます：
```bash
git add .
git commit -m "feat: 新機能追加"
git push origin main
```

## モニタリング

- **CloudWatch Logs**: Lambda関数のログ
- **Amplify Console**: ビルド/デプロイログ
- **X-Ray**: パフォーマンストレーシング

## セキュリティ設定

### 1. WAF (Web Application Firewall)
```bash
# AWS WAFをAmplifyアプリに関連付け
aws wafv2 associate-web-acl \
  --web-acl-arn <WAF_ACL_ARN> \
  --resource-arn <AMPLIFY_APP_ARN> \
  --region ap-northeast-1
```

### 2. CloudFrontディストリビューション
Amplifyが自動で作成しますが、追加設定が可能：
- Geo Restriction（地理的制限）
- カスタムエラーページ
- カスタムヘッダー

## バックアップとロールバック

### ロールバック
Amplifyコンソールで過去のデプロイに戻す：
1. **「ビルド履歴」**タブ
2. 戻したいビルドを選択
3. **「再デプロイ」**をクリック

## コスト見積もり

- **Amplify Hosting**: 約$0.01/ビルド分 + $0.15/GB/月（ストレージ）
- **CloudFront**: $0.114/GB（データ転送）
- **Lambda**: $0.20/100万リクエスト
- **API Gateway**: $3.50/100万リクエスト

月間10,000ユーザー想定: **約$50-100/月**

