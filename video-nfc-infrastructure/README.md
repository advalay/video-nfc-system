# NFCタグ付きキーホルダー向け動画配信システム - AWS CDK インフラ

このプロジェクトは、NFCタグ付きキーホルダー向け動画配信システムのAWSインフラをAWS CDK v2で構築します。

## 📋 目次

- [アーキテクチャ概要](#アーキテクチャ概要)
- [前提条件](#前提条件)
- [プロジェクト構成](#プロジェクト構成)
- [構築されるAWSリソース](#構築されるawsリソース)
- [セットアップ手順](#セットアップ手順)
- [デプロイ](#デプロイ)
- [初回セットアップ](#初回セットアップ)
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
AWS_ACCOUNT_ID=your-account-id
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
│   └── src/handlers/                # 組織・販売店・統計管理Lambda関数（17個）
│       ├── createOrganization.ts       # 組織作成
│       ├── createOrganizationWithUser.ts # 組織+ユーザー作成
│       ├── updateOrganization.ts       # 組織更新
│       ├── deleteOrganization.ts       # 組織削除
│       ├── getOrganizations.ts         # 組織一覧取得
│       ├── listOrganizations.ts        # 組織リスト取得
│       ├── getOrganizationAdmin.ts     # 組織管理者情報取得
│       ├── getOrganizationStats.ts     # 組織統計取得
│       ├── resetOrganizationPassword.ts # 組織パスワードリセット
│       ├── createShop.ts               # 販売店作成
│       ├── updateShop.ts               # 販売店更新
│       ├── deleteShop.ts               # 販売店削除
│       ├── getShopStats.ts             # 販売店統計取得
│       ├── resetShopPassword.ts        # 販売店パスワードリセット
│       ├── getUserShops.ts             # ユーザー販売店一覧（マルチロール用・現在未使用）
│       ├── getSystemStats.ts           # システム統計取得
│       ├── getAdminStats.ts            # 管理統計取得
│       └── listAllVideos.ts            # 全動画一覧取得
├── scripts/
│   ├── setup-test-accounts.sh       # テストアカウント作成
│   └── migrate-user-shop-relations.ts # マルチロール用マイグレーション（現在未使用）
├── cdk.json                         # CDK設定ファイル
├── package.json                     # npm依存関係
├── tsconfig.json                    # TypeScript設定
└── README.md                        # このファイル
```

## 🔧 構築されるAWSリソース

### 1. DynamoDB テーブル (Database Stack)

#### VideoMetadata テーブル
- **パーティションキー**: videoId (String)
- **GSI1**: agencyId-uploadDate-index (代理店別動画検索)
- **GSI2**: billingMonth-agencyId-index (請求月別検索)
- **属性**: title, fileName, organizationId, shopId, uploadDate, fileSize, status

#### Organization テーブル
- **パーティションキー**: organizationId (String)
- **属性**: organizationType, organizationName, email, phone, address, status, shops[]
- **GSI1**: organizationType-status-index (タイプ別検索)

#### Shop テーブル
- **パーティションキー**: shopId (String)
- **属性**: shopName, organizationId, contactPerson, email, phone, status

#### UserShopRelation テーブル（マルチロール用・現在未使用）
- **パーティションキー**: userId (String)
- **ソートキー**: shopId (String)
- **属性**: role, organizationId, createdAt

#### Billing テーブル
- **パーティションキー**: billingId (String)
- **属性**: organizationId, billingMonth, videoCount, totalStorage, amount

#### ApprovalRequest テーブル
- **パーティションキー**: requestId (String)
- **属性**: requestType, recipientEmail, status, submissionData, formUrl
- **GSI1**: approverEmail-status-index (承認者別検索)
- **GSI2**: status-createdAt-index (ステータス別検索)

### 2. Cognito (Auth Stack)

#### User Pool Groups
- **system-admin**: システム管理者（全機能アクセス可能）
- **organization-admin**: 組織管理者（自組織と配下販売店を管理）
- **shop-admin**: 販売店管理者（自販売店のみ管理）

#### カスタム属性
- custom:organizationId - 所属組織ID
- custom:shopId - 所属販売店ID
- custom:organizationName - 組織名
- custom:shopName - 販売店名
- custom:role - ユーザーロール

#### 現在の仕様
- ✅ 1メールアドレス = 1ロール（シンプル設計）
- ✅ 組織管理者と販売店管理者は別々のメールアドレス
- 📝 マルチロール機能は現在無効（将来的に再実装可能）

### 3. API Gateway REST API (API Stack)

#### 動画管理エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/videos/upload-url` | 必須 | 署名付きURL生成 |
| GET | `/videos` | 必須 | 動画一覧取得 |
| GET | `/videos/{videoId}` | 必須 | 動画詳細取得 |
| DELETE | `/videos/{videoId}` | 必須 | 動画削除（24時間以内のみ） |
| GET | `/videos/{videoId}/detail` | 不要 | 公開動画詳細 |

#### 組織管理エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/organizations` | 必須 | 組織一覧取得 |
| POST | `/organizations` | 必須 | 組織作成 |
| PUT | `/organizations/{organizationId}` | 必須 | 組織更新 |
| DELETE | `/organizations/{organizationId}` | 必須 | 組織削除 |
| GET | `/organizations/{organizationId}/admin` | 必須 | 組織管理者情報取得 |
| POST | `/organizations/{organizationId}/reset-password` | 必須 | 組織パスワードリセット |
| GET | `/organization/stats` | 必須 | 組織統計取得 |

#### 販売店管理エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/shops` | 必須 | 販売店作成 |
| PUT | `/shops/{shopId}` | 必須 | 販売店更新 |
| DELETE | `/shops/{shopId}` | 必須 | 販売店削除 |
| GET | `/shop/stats` | 必須 | 販売店統計取得 |
| POST | `/shops/{shopId}/reset-password` | 必須 | 販売店パスワードリセット |

#### 統計エンドポイント
| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/system/stats` | 必須 | システム統計取得（system-adminのみ） |
| GET | `/admin/stats` | 必須 | 管理統計取得 |

### 4. Lambda関数（22個）

#### 動画管理（5個）
- generateUploadUrl
- listVideos
- getVideoDetail
- deleteVideo
- getVideoDetailPublic

#### 組織・販売店管理（17個）
- createOrganization
- createOrganizationWithUser
- updateOrganization
- deleteOrganization
- getOrganizations
- listOrganizations
- getOrganizationAdmin
- getOrganizationStats
- resetOrganizationPassword
- createShop
- updateShop
- deleteShop
- getShopStats
- resetShopPassword
- getUserShops（マルチロール用・現在未使用）
- getSystemStats
- getAdminStats
- listAllVideos

### 5. S3バケット（Storage Stack）

- **VideoBucket**: 動画ファイル保存
- **AssetBucket**: 静的アセット保存
- **CloudFront**: CDN配信

### 6. SNS・CloudWatch（Monitoring Stack）

- **SNSトピック**: エラーアラート通知
- **CloudWatchアラーム**: Lambda/API Gateway/DynamoDBの監視

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
AWS_ACCOUNT_ID=your-account-id
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

### 本番環境へのデプロイ

```bash
npm run deploy:prod
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
export SNS_TOPIC_ARN="arn:aws:sns:ap-northeast-1:your-account-id:video-nfc-alerts-dev"

aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint admin@example.com
```

### 3. テストアカウントの作成

```bash
cd scripts
./setup-test-accounts.sh
```

## 📚 運用ガイド

### CloudWatch Logsの確認

```bash
# Lambda関数のログ
aws logs tail /aws/lambda/createOrganization --follow

# API Gatewayのログ
aws logs tail /aws/apigateway/video-nfc-dev --follow
```

### DynamoDBテーブルの確認

```bash
# 組織一覧の確認
aws dynamodb scan --table-name video-nfc-Organization-dev --max-items 10

# 販売店一覧の確認
aws dynamodb scan --table-name video-nfc-Shop-dev --max-items 10
```

## 🔐 API エンドポイント

### 認証

すべての認証が必要なエンドポイントでは、Cognito IDトークンを`Authorization`ヘッダーに設定してください:

```bash
curl -H "Authorization: Bearer $ID_TOKEN" \
  https://your-api-gateway-url/dev/organizations
```

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

## 📊 主要ドキュメント

- **[S3_UPLOAD_FIX_REPORT.md](./S3_UPLOAD_FIX_REPORT.md)** - S3アップロード修正の重要な記録

## 📄 ライセンス

このプロジェクトは社内利用目的で作成されています。

## 👥 サポート

質問や問題がある場合は、開発チームにお問い合わせください。

---

**最終更新**: 2025年10月27日  
**バージョン**: 2.1.0（マルチロール機能無効化・ファイル整理完了）  
**管理者**: AWSアーキテクトチーム
