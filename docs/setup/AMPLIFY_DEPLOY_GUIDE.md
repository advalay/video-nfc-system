# AWS Amplify デプロイガイド

このガイドでは、video-nfc-admin（管理画面）をAWS Amplifyにデプロイする手順を説明します。

## 📋 前提条件

### 必須事項
1. **AWSアカウント**: 適切な権限を持つアWSアカウント
2. **GitHubリポジトリ**: コードがGitHubにプッシュされていること
3. **バックエンドのデプロイ**: video-nfc-infrastructure（CDK）が既にデプロイされていること
   - API Gateway URL
   - Cognito User Pool ID
   - Cognito User Pool Client ID

### 必要な情報
デプロイ前に以下の情報を準備してください：

```bash
# バックエンドから取得
API Gateway URL: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/dev
Cognito User Pool ID: ap-northeast-1_XXXXXXXXX
Cognito User Pool Client ID: xxxxxxxxxxxxxxxxxxxxx
AWS Region: ap-northeast-1
```

## 🚀 デプロイ手順

### 1. Amplifyアプリケーションの作成

#### A. AWSコンソールからの手順

1. **AWS Amplifyコンソールを開く**
   ```
   https://console.aws.amazon.com/amplify/
   ```

2. **「新しいアプリ」→「ホスティングを使ってみる」を選択**

3. **GitHubと接続**
   - GitHubを選択
   - リポジトリ: `video-nfc-admin` を選択
   - ブランチ: `main` または `master` を選択
   - 「次へ」をクリック

4. **ビルド設定の確認**
   - Amplifyが自動的に `amplify.yml` を検出します
   - デフォルト設定のまま「次へ」

5. **環境変数の設定**
   - 「環境変数」セクションで以下を追加：

   ```
   NEXT_PUBLIC_API_URL = https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
   NEXT_PUBLIC_USER_POOL_ID = ap-northeast-1_gtvMJ70ot
   NEXT_PUBLIC_USER_POOL_CLIENT_ID = 6u6eqm9jqhc0vdvhfvto7ji3gg
   NEXT_PUBLIC_AWS_REGION = ap-northeast-1
   ```

6. **確認とデプロイ**
   - 設定を確認して「保存してデプロイ」をクリック
   - 初回ビルドが開始されます（約5-10分）

#### B. AWS CLIからの手順

```bash
# 1. Amplifyアプリを作成
aws amplify create-app \
  --name video-nfc-admin \
  --repository https://github.com/YOUR_USERNAME/video-nfc-admin \
  --region ap-northeast-1

# 2. ブランチを接続
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region ap-northeast-1

# 3. 環境変数を設定
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables \
    NEXT_PUBLIC_API_URL=https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev \
    NEXT_PUBLIC_USER_POOL_ID=ap-northeast-1_gtvMJ70ot \
    NEXT_PUBLIC_USER_POOL_CLIENT_ID=6u6eqm9jqhc0vdvhfvto7ji3gg \
    NEXT_PUBLIC_AWS_REGION=ap-northeast-1 \
  --region ap-northeast-1

# 4. ビルドを開始
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region ap-northeast-1
```

### 2. ビルド設定の詳細

プロジェクトルートに `amplify.yml` が既に作成されています：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - node -v
        - npm -v
        - npm ci
    build:
      commands:
        - npm run type-check
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

### 3. 環境変数の管理

#### 開発環境 (dev)
```
NEXT_PUBLIC_API_URL = https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
NEXT_PUBLIC_USER_POOL_ID = ap-northeast-1_gtvMJ70ot
NEXT_PUBLIC_USER_POOL_CLIENT_ID = 6u6eqm9jqhc0vdvhfvto7ji3gg
NEXT_PUBLIC_AWS_REGION = ap-northeast-1
```

#### 本番環境 (prod) ※将来的に
```
NEXT_PUBLIC_API_URL = https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID = ap-northeast-1_YYYYYYYYY
NEXT_PUBLIC_USER_POOL_CLIENT_ID = yyyyyyyyyyyyyyyyyyyy
NEXT_PUBLIC_AWS_REGION = ap-northeast-1
```

### 4. ビルドプロセス

Amplifyは以下の順序でビルドを実行します：

1. **preBuild**: 依存関係のインストール
   ```bash
   npm ci
   ```

2. **build**: TypeScript型チェックとNext.jsビルド
   ```bash
   npm run type-check
   npm run build
   ```

3. **deploy**: ビルド成果物をデプロイ
   - `.next` ディレクトリの内容をCDNにデプロイ

## 🔍 デプロイ後の確認

### 1. デプロイ状況の確認

Amplifyコンソールで以下を確認：
- ビルドログ: エラーがないか確認
- デプロイ状況: "デプロイ完了" になっているか
- アプリURL: `https://xxxxx.amplifyapp.com`

### 2. 動作確認

1. **URLにアクセス**
   ```
   https://main.xxxxx.amplifyapp.com
   ```

2. **ログインテスト**
   - Cognitoユーザーでログイン
   - 認証が正常に動作するか確認

3. **API接続テスト**
   - 組織一覧の取得
   - 動画一覧の表示
   - API Gatewayとの通信を確認

### 3. エラー確認方法

#### ビルドエラーの場合
```bash
# Amplifyコンソールでビルドログを確認
# または、ローカルで再現：
cd /Users/kosuke/video-nfc-admin
npm ci
npm run type-check
npm run build
```

#### ランタイムエラーの場合
- ブラウザの開発者ツールでコンソールエラーを確認
- 環境変数が正しく設定されているか確認
- API GatewayのCORS設定を確認

## ⚙️ 高度な設定

### カスタムドメインの設定

1. **Route 53でドメインを準備**
2. **Amplifyコンソール → ドメイン管理**
3. **カスタムドメインを追加**
   - 例: `admin.yourdomain.com`
4. **SSL証明書の自動発行**
   - Amplifyが自動的にACM証明書を発行

### プレビュー環境の設定

```bash
# feature ブランチの自動プレビュー
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name feature/new-feature \
  --enable-auto-build true \
  --region ap-northeast-1
```

各ブランチが独自のURLを持ちます：
- `main`: `https://main.xxxxx.amplifyapp.com`
- `feature/new-feature`: `https://feature-new-feature.xxxxx.amplifyapp.com`

### 通知設定

```bash
# ビルド失敗時にSNS通知
aws amplify create-webhook \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region ap-northeast-1
```

## 🔐 セキュリティベストプラクティス

### 1. 基本認証の設定（オプション）

開発環境に基本認証を追加：

```bash
aws amplify update-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --basic-auth-credentials username:password \
  --enable-basic-auth \
  --region ap-northeast-1
```

### 2. 環境変数の保護

- 環境変数にシークレット情報を含めない
- API認証はCognitoトークンで行う
- `.env.local` はGitにコミットしない

### 3. CORS設定の確認

API Gateway側で適切なCORSヘッダーを設定：

```typescript
// lib/api-stack.ts で既に設定済み
defaultCorsPreflightOptions: {
  allowOrigins: [
    'http://localhost:3000',
    'https://*.amplifyapp.com',  // Amplifyのドメイン
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}
```

## 📊 監視とログ

### CloudWatch Logsの確認

```bash
# Amplifyのビルドログを確認
aws logs tail /aws/amplify/YOUR_APP_ID --follow
```

### メトリクスの監視

Amplifyコンソールで以下を監視：
- リクエスト数
- データ転送量
- エラー率
- レスポンスタイム

## 🔄 継続的デプロイ (CI/CD)

### 自動デプロイの設定

デフォルトで有効になっています：
1. GitHubの `main` ブランチにプッシュ
2. Amplifyが自動的にビルド開始
3. ビルド成功後、自動デプロイ

### プルリクエストプレビュー

```bash
# PRごとにプレビュー環境を自動作成
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --enable-branch-auto-build \
  --enable-auto-branch-creation \
  --region ap-northeast-1
```

## 📝 トラブルシューティング

### よくあるエラーと解決方法

#### 1. ビルドエラー: "Module not found"
```bash
# 解決策: package-lock.jsonを確認
npm ci
npm run build  # ローカルで再現
```

#### 2. 環境変数が読み込まれない
```bash
# 解決策: NEXT_PUBLIC_ プレフィックスを確認
# ブラウザ側で使用する変数は NEXT_PUBLIC_ が必須
```

#### 3. Cognito認証エラー
```bash
# 解決策: User Pool IDとClient IDを確認
# Amplifyコンソールで環境変数を再設定
```

#### 4. API CORS エラー
```bash
# 解決策: API GatewayのCORS設定にAmplifyドメインを追加
# lib/api-stack.ts を更新して再デプロイ
```

### ローカルでのビルド確認

```bash
cd /Users/kosuke/video-nfc-admin

# 環境変数を設定
export NEXT_PUBLIC_API_URL=https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
export NEXT_PUBLIC_USER_POOL_ID=ap-northeast-1_gtvMJ70ot
export NEXT_PUBLIC_USER_POOL_CLIENT_ID=6u6eqm9jqhc0vdvhfvto7ji3gg
export NEXT_PUBLIC_AWS_REGION=ap-northeast-1

# ビルド実行
npm run type-check
npm run build

# ローカルで本番モード起動
npm start
```

## 📦 コストの目安

### Amplify Hostingの料金

- **ビルド時間**: $0.01/分
- **ストレージ**: $0.023/GB/月
- **データ転送**: 最初の15GB無料、以降 $0.15/GB

### 概算（小規模サイト）
- ビルド: 5分 × 30回/月 = $1.50
- ストレージ: 1GB = $0.023
- データ転送: 10GB = 無料
- **合計**: 約 $2/月

## 🎯 次のステップ

1. **カスタムドメインの設定** (オプション)
2. **CloudFront Cache設定の最適化**
3. **WAFの設定** (本番環境推奨)
4. **パフォーマンス監視の強化**
5. **自動バックアップの設定**

## 📚 参考リンク

- [AWS Amplify ドキュメント](https://docs.aws.amazon.com/amplify/)
- [Next.js + Amplify ガイド](https://nextjs.org/docs/deployment#aws-amplify)
- [Amplify環境変数](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)

## 👥 サポート

質問やトラブルがある場合は、開発チームにお問い合わせください。

---

**最終更新**: 2025年10月
**バージョン**: 1.0.0
**管理者**: AWSアーキテクトチーム
