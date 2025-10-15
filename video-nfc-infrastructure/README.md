# NFCタグ付きキーホルダー向け動画配信システム - AWS CDK インフラ

このプロジェクトは、NFCタグ付きキーホルダー向け動画配信システムのAWSインフラをAWS CDK v2で構築します。

## 📋 目次

- [アーキテクチャ概要](#アーキテクチャ概要)
- [前提条件](#前提条件)
- [プロジェクト構成](#プロジェクト構成)
- [構築されるAWSリソース](#構築されるawsリソース)
- [承認ワークフロー](#承認ワークフロー)
- [セットアップ手順](#セットアップ手順)
- [デプロイ](#デプロイ)
- [初回セットアップ](#初回セットアップ)
- [運用ガイド](#運用ガイド)
- [API エンドポイント](#api-エンドポイント)

## 🏗 アーキテクチャ概要

本システムは以下のAWSサービスで構成されています:

- **API**: API Gateway REST API (エンドポイント提供)
- **コンピューティング**: Lambda (ビジネスロジック実行)
- **ストレージ**: S3 (動画・アセット保存)、CloudFront (CDN配信)
- **データベース**: DynamoDB (メタデータ、請求、組織情報)
- **認証**: Cognito User Pool (ユーザー管理・認証)
- **通知**: SNS (メール通知)
- **監査**: CloudTrail (S3データイベント記録)

## ✅ 前提条件

### 必須ツール

- **Node.js**: v18.x 以上
- **npm**: v9.x 以上
- **AWS CLI**: v2.x 以上
- **AWS CDK CLI**: v2.110.0 以上

### AWS環境

- AWSアカウント
- 適切なIAM権限（AdministratorAccess推奨）
- AWS CLIの認証設定が完了していること

### 環境変数

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください:

```bash
ENV=dev
AWS_ACCOUNT_ID=271633506783
AWS_REGION=ap-northeast-1
ALERT_EMAIL=your-email@example.com  # エラーアラート送信先メールアドレス
```

## 📁 プロジェクト構成

```
video-nfc-infrastructure/
├── bin/
│   └── app.ts                       # CDKアプリケーションのエントリーポイント
├── lib/
│   ├── video-nfc-stack.ts           # メインスタック (Lambda実行ロール)
│   ├── storage-stack.ts             # ストレージスタック (S3, CloudFront, CloudTrail)
│   ├── database-stack.ts            # データベーススタック (DynamoDB)
│   ├── auth-stack.ts                # 認証スタック (Cognito)
│   ├── api-stack.ts                 # APIスタック (REST API + Lambda)
│   └── monitoring-stack.ts          # 監視スタック (CloudWatch, SNS)
├── services/                        # 動画管理Lambda関数
│   ├── generate-upload-url/         # POST /videos/upload-url
│   ├── list-videos/                 # GET /videos
│   ├── get-video-detail/            # GET /videos/{videoId}
│   ├── delete-video/                # DELETE /videos/{videoId}
│   └── get-video-detail-public/     # GET /videos/{videoId}/detail (公開)
├── lambda/
│   └── src/handlers/                # 承認ワークフローLambda関数
│       ├── createApprovalRequest.js    # 承認申請作成
│       ├── submitApprovalForm.js       # フォーム送信
│       ├── getPendingApprovals.js      # 承認待ち一覧取得
│       ├── getApprovalRequest.js       # 承認申請詳細取得
│       ├── approveRequest.js           # 承認処理
│       ├── rejectRequest.js            # 却下処理
│       ├── deleteOrganization.js       # 組織削除
│       └── updateOrganizationWithCors.js # 組織更新
├── cdk.json                         # CDK設定ファイル
├── package.json                     # npm依存関係
├── tsconfig.json                    # TypeScript設定
├── .env.example                     # 環境変数のサンプル
├── .gitignore                       # Git除外設定
├── README.md                        # このファイル
├── API_GATEWAY_SETUP.md             # API Gateway設定ガイド
├── APPROVAL_WORKFLOW_DESIGN.md      # 承認ワークフロー設計書
├── MANUAL_TEST_DATA_GUIDE.md        # テストデータ作成ガイド
└── TEST_ACCOUNTS.md                 # テストアカウント情報
```

## 🔧 構築されるAWSリソース

### 1. DynamoDB テーブル (Database Stack)

#### VideoMetadata テーブル
- **パーティションキー**: videoId (String)
- **GSI1**: agencyId-uploadDate-index (代理店別動画検索)
- **GSI2**: billingMonth-agencyId-index (請求月別検索)

#### Organization テーブル
- **パーティションキー**: organizationId (String)
- **属性**: organizationType, organizationName, email, phone, address, status, unitPrice, totalVideos, totalStorage
- **GSI1**: organizationType-status-index (タイプ別検索)
- **GSI2**: parentId-createdAt-index (階層構造検索)

#### ApprovalRequest テーブル
- **パーティションキー**: requestId (String)
- **属性**: requestType, recipientEmail, status, submissionData, formUrl, createdAt, expiresAt
- **GSI1**: approverEmail-status-index (承認者別検索)
- **GSI2**: status-createdAt-index (ステータス別検索)

### 2. Cognito (Auth Stack)

#### User Pool Groups
- **system-admin**: システム管理者
- **organization-admin**: 組織管理者（代理店）
- **shop-user**: 販売店ユーザー

#### カスタム属性
- custom:organizationId
- custom:shopId
- custom:role

### 3. API Gateway REST API (API Stack)

#### 動画管理エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/videos/upload-url` | 必須 | 署名付きURL生成 |
| GET | `/videos` | 必須 | 動画一覧取得 |
| GET | `/videos/{videoId}` | 必須 | 動画詳細取得 |
| DELETE | `/videos/{videoId}` | 必須 | 動画削除 |
| GET | `/videos/{videoId}/detail` | 不要 | 公開動画詳細 |

#### 組織管理エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/organizations` | 必須 | 組織一覧取得 |
| POST | `/organizations` | 必須 | 組織作成 |
| PUT | `/organizations/{organizationId}` | 必須 | 組織更新 |
| DELETE | `/organizations/{organizationId}` | 必須 | 組織削除 |

#### 承認ワークフローエンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/approvals` | 必須 | 承認待ち一覧取得 |
| POST | `/approvals` | 必須 | 承認申請作成 |
| GET | `/approvals/{requestId}` | 不要 | 承認申請詳細取得 |
| POST | `/approvals/{requestId}/submit` | 不要 | フォーム送信 |
| POST | `/approvals/{requestId}/approve` | 必須 | 承認処理 |
| POST | `/approvals/{requestId}/reject` | 必須 | 却下処理 |

## 🔄 承認ワークフロー

### 1. 申請フロー
1. **システム管理者**が承認申請を作成
2. **申請者**にメールでフォームURLを送信
3. **申請者**がフォームに組織情報を入力・送信
4. **システム管理者**に承認通知メールが送信

### 2. 承認フロー
1. **システム管理者**が申請内容を確認
2. **承認**: 自動的にCognitoユーザー作成・組織登録・メール通知
3. **却下**: 申請者に却下理由とともにメール通知

### 3. 組織階層
- **パートナー企業** (organizationType: 'agency')
  - **販売店** (organizationType: 'store', parentId: パートナー企業のID)

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
cd video-nfc-infrastructure
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します。

```bash
cp .env.example .env
```

`.env`ファイルを編集して、以下の値を設定します:

```bash
# 環境設定 (dev or prod)
ENV=dev

# AWSアカウント情報
AWS_ACCOUNT_ID=271633506783
AWS_REGION=ap-northeast-1

# アラート設定
ALERT_EMAIL=admin@example.com
```

### 4. AWS CLIの認証確認

```bash
aws sts get-caller-identity
```

### 5. CDKのブートストラップ (初回のみ)

```bash
npm run cdk bootstrap
```

## 📦 デプロイ

### 開発環境へのデプロイ

```bash
npm run deploy:dev
```

### 個別スタックのデプロイ

```bash
# 依存関係順でデプロイ
npx cdk deploy VideoNfcStorageStack-dev
npx cdk deploy VideoNfcDatabaseStack-dev
npx cdk deploy VideoNfcAuthStack-dev
npx cdk deploy VideoNfcMainStack-dev
npx cdk deploy VideoNfcApiStack-dev
npx cdk deploy VideoNfcMonitoringStack-dev
```

## 🎯 初回セットアップ

### 1. システム管理者ユーザーの作成

```bash
export USER_POOL_ID="ap-northeast-1_XXXXXXXXX"
export ADMIN_EMAIL="admin@example.com"

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_EMAIL \
  --user-attributes Name=email,Value=$ADMIN_EMAIL Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_EMAIL \
  --group-name system-admin
```

### 2. SNSトピックのサブスクリプション

```bash
export SNS_TOPIC_ARN="arn:aws:sns:ap-northeast-1:271633506783:video-nfc-alerts-dev"

aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint admin@example.com
```

## 📚 運用ガイド

### CloudWatch Logsの確認

```bash
# Lambda関数のログ
aws logs tail /aws/lambda/createApprovalRequest --follow
aws logs tail /aws/lambda/approveRequest --follow

# API Gatewayのログ
aws logs tail /aws/apigateway/video-nfc-dev --follow
```

### DynamoDBテーブルの確認

```bash
# 承認申請の確認
aws dynamodb scan --table-name video-nfc-ApprovalRequest-dev --max-items 10

# 組織一覧の確認
aws dynamodb scan --table-name video-nfc-Organization-dev --max-items 10
```

### 承認ワークフローのテスト

1. **申請作成**: 管理画面から承認申請を作成
2. **フォーム入力**: 申請者に送信されたURLでフォーム入力
3. **承認処理**: 管理画面で申請を承認・却下

## 🔐 API エンドポイント

### 認証

すべての認証が必要なエンドポイントでは、Cognito IDトークンを`Authorization`ヘッダーに設定してください:

```bash
curl -H "Authorization: Bearer $ID_TOKEN" \
  https://your-api-gateway-url/dev/approvals
```

### 承認ワークフロー API

#### 承認申請作成

```bash
curl -X POST https://your-api-gateway-url/dev/approvals \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "agency",
    "recipientEmail": "applicant@example.com"
  }'
```

#### フォーム送信（認証不要）

```bash
curl -X POST https://your-api-gateway-url/dev/approvals/request-id/submit \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "株式会社サンプル",
    "email": "applicant@example.com",
    "phone": "03-1234-5678",
    "address": "東京都渋谷区...",
    "unitPrice": 1200
  }'
```

#### 承認処理

```bash
curl -X POST https://your-api-gateway-url/dev/approvals/request-id/approve \
  -H "Authorization: Bearer $ID_TOKEN"
```

## 🧪 テスト

### テストアカウント

詳細は `TEST_ACCOUNTS.md` を参照してください。

### テストデータ

詳細は `MANUAL_TEST_DATA_GUIDE.md` を参照してください。

## 🔐 セキュリティベストプラクティス

1. **環境変数ファイル**: `.env`ファイルは絶対にGitにコミットしない
2. **IAM権限**: 最小権限の原則に従ってカスタマイズ
3. **CORS設定**: 本番環境では適切なオリジンに制限
4. **MFA**: 本番環境では必須に設定することを推奨
5. **CloudTrail**: すべてのAPI呼び出しが記録されます

## 📝 トラブルシューティング

### デプロイエラー: "AWS_ACCOUNT_ID is not defined"

`.env`ファイルに正しいAWSアカウントIDが設定されているか確認してください。

### CORS エラー

API GatewayのCORS設定を確認し、必要に応じて再デプロイしてください。

### Lambda関数エラー

CloudWatch Logsでエラー詳細を確認し、必要に応じてコードを修正・再デプロイしてください。

## 📄 ライセンス

このプロジェクトは社内利用目的で作成されています。

## 👥 サポート

質問や問題がある場合は、開発チームにお問い合わせください。

---

**作成日**: 2025年10月  
**バージョン**: 2.0.0 (承認ワークフロー実装完了)  
**管理者**: AWSアーキテクトチーム