# Advalay Video Uploader

マルチテナントYouTubeアップロードシステムのMVP実装です。

## 概要

各店舗専用の公開アップロード画面から、MP4ファイル（最大200MB）を限定公開（unlisted）でYouTubeへ自動アップロードし、完了後に店舗責任者へ通知メールを送信するシステムです。

## アーキテクチャ

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Backend**: NestJS (TypeScript)
- **Worker**: BullMQ + Redis（並列処理・時間分散）
- **Database**: PostgreSQL + Prisma
- **Storage**: AWS S3（署名URL PUT）
- **Mail**: AWS SES
- **Secrets**: AWS KMS
- **YouTube**: googleapis (YouTube v3 API)

## 機能

- ✅ 店舗専用URL（storeToken）による認証
- ✅ MP4ファイル（200MB上限）のアップロード
- ✅ YouTube限定公開アップロード
- ✅ 完了・失敗通知メール（SES）
- ✅ 並列処理・指数バックオフ
- ✅ 原本ファイル自動削除
- ✅ リアルタイム進捗表示

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. データベースとRedisの起動

```bash
docker compose up -d
```

### 3. データベースマイグレーション

```bash
pnpm db:migrate
```

### 4. シードデータの作成

```bash
pnpm db:seed
```

### 5. 環境変数の設定

`.env`ファイルを作成し、`env.example`の内容を参考に設定してください。

### 5. S3バケットのCORS設定

フロントエンドから直接S3にアップロードできるように、CORS設定を適用します：

```bash
# AWS CLIでCORS設定を適用
./setup-s3-cors.sh

# または手動で設定
aws s3api put-bucket-cors --bucket advalay-video-uploads --cors-configuration file://s3-cors-config.json
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

これにより以下が起動します：
- Web: http://localhost:3000
- API: http://localhost:4000
- Worker: バックグラウンドで動作

### 7. テスト店舗へのアクセス

シードデータで作成されたテスト店舗のURL：
```
http://localhost:3000/store/store_test_token_001
```

## API仕様

OpenAPI仕様書: http://localhost:4000/api/docs

### 主要エンドポイント

- `GET /api/v1/public/banner` - チャンネル名取得
- `POST /api/v1/public/uploads/init` - アップロード初期化
- `POST /api/v1/public/uploads/{uploadId}/complete` - アップロード完了
- `GET /api/v1/jobs/{jobId}` - ジョブ状態確認
- `POST /api/v1/channels/oauth/start` - OAuth開始
- `POST /api/v1/channels/oauth/callback` - OAuthコールバック

## データベーススキーマ

### 主要テーブル

- `companies` - 企業情報
- `stores` - 店舗情報（storeTokenHashで認証）
- `youtube_channels` - YouTubeチャンネル情報（refresh_token暗号化保存）
- `upload_jobs` - アップロードジョブ（状態管理）
- `videos` - アップロード済み動画情報

## セキュリティ

- 店舗トークンはargon2でハッシュ化保存
- refresh_tokenはKMSで暗号化
- S3署名URLは10分TTL
- MP4ファイルのみ許可、200MB上限

## 運用

### スケール想定
- 50店舗 × 4本/日 = 200本/日
- 並列処理: 10-20ジョブ
- 指数バックオフ: 30s→2m→6m（最大5回）

### 監視
- ジョブ状態の追跡
- 失敗時の自動通知
- ログ出力

## 開発

### コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# データベース操作
pnpm db:generate  # Prismaクライアント生成
pnpm db:migrate   # マイグレーション実行
pnpm db:seed      # シードデータ作成
```

### プロジェクト構造

```
├── apps/
│   ├── web/          # Next.js フロントエンド
│   ├── api/          # NestJS API
│   └── worker/       # BullMQ ワーカー
├── packages/
│   └── db/           # Prisma スキーマ・クライアント
├── docker-compose.yml
└── package.json
```

## ライセンス

Private
