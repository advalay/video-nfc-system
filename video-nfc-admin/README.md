# Video NFC Admin System 🎬

NFCタグ付きキーホルダー向け動画配信システムの管理画面

## 📋 システム概要

### 主要機能
- **動画管理**: 動画のアップロード・一覧表示・削除
- **組織管理**: パートナー企業と販売店の階層管理
- **統計表示**: システム全体・組織別・販売店別の統計情報
- **ユーザー管理**: 3つのロール（システム管理者・組織管理者・販売店管理者）

### ユーザーロール
- **system-admin**: システム全体の管理（全組織・全販売店・全動画）
- **organization-admin**: 自組織と配下販売店の管理
- **shop-admin**: 自販売店の管理と動画アップロード

### 現在の仕様
- ✅ 1メールアドレス = 1ロール（シンプル設計）
- ✅ 組織管理者と販売店管理者は別々のメールアドレス
- 📝 マルチロール機能は現在無効（将来的に再実装可能）

## 🏗 技術スタック

### フロントエンド
- **Next.js 15** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **React Query** - データフェッチング
- **AWS Amplify** - 認証・ホスティング

### バックエンド
- **AWS API Gateway** - REST API
- **AWS Lambda** - サーバーレス関数（20個）
- **Amazon DynamoDB** - データベース（6テーブル）
- **Amazon S3** - 動画ストレージ
- **Amazon Cognito** - 認証・ユーザー管理
- **Amazon CloudFront** - CDN配信

## 🚀 開発環境セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定：

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
NEXT_PUBLIC_APP_ENV=development
```

### 3. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開く

## 📦 本番デプロイ

### AWS Amplify Hosting

1. **Amplify Console**にアクセス
2. **GitHubリポジトリ**を接続
3. **モノレポルート**: `video-nfc-admin` を指定
4. **環境変数**を設定（上記の環境変数参照）
5. **デプロイ実行**

詳細は `docs/guides/DEPLOYMENT_GUIDE.md` を参照

## 📚 ドキュメント

### 運用ガイド
- [NON_ENGINEER_GUIDE.md](./docs/guides/NON_ENGINEER_GUIDE.md) - 非エンジニア向けガイド
- [QUICK_UPDATE_GUIDE.md](./docs/guides/QUICK_UPDATE_GUIDE.md) - クイック更新ガイド
- [DEPLOYMENT_GUIDE.md](./docs/guides/DEPLOYMENT_GUIDE.md) - デプロイガイド

### セットアップ
- [ENV_VARIABLES.md](./docs/setup/ENV_VARIABLES.md) - 環境変数設定
- [AMPLIFY_DEPLOY_GUIDE.md](./docs/setup/AMPLIFY_DEPLOY_GUIDE.md) - Amplifyデプロイ手順

### リリース
- [RELEASE_PLAN.md](./RELEASE_PLAN.md) - リリース計画
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) - リリースチェックリスト
- [RELEASE_READINESS_CHECK.md](./RELEASE_READINESS_CHECK.md) - リリース準備状況

### トラブルシューティング
- [UPLOAD_URL_FIX_SUMMARY.md](./UPLOAD_URL_FIX_SUMMARY.md) - S3アップロード修正まとめ

## 🔧 主要機能

### 動画管理
- アップロード（S3直接アップロード + 進捗表示）
- 一覧表示（組織・販売店でフィルタリング）
- 詳細表示（タイトル・ファイル名・ID・QRコード）
- 削除（24時間以内の動画のみ）

### 組織管理（システム管理者のみ）
- パートナー企業の作成・編集・削除
- 販売店の作成・編集・削除
- 組織管理者情報の表示
- パスワードリセット

### 統計表示
- **システム統計**: 全組織・全販売店・全動画の統計
- **組織統計**: 自組織と配下販売店の統計
- **販売店統計**: 自販売店の動画数・アクティビティ

## 🗂 プロジェクト構造

```
video-nfc-admin/
├── app/                      # Next.js App Router
│   ├── admin/                # 管理画面
│   │   ├── organizations/    # 組織管理
│   │   └── system-stats/     # システム統計
│   ├── shop/                 # 販売店画面
│   │   └── stats/            # 販売店統計
│   ├── videos/               # 動画一覧
│   ├── upload/               # 動画アップロード
│   └── watch/                # 動画視聴
├── components/               # Reactコンポーネント
│   ├── Layout.tsx            # レイアウト
│   ├── ProtectedRoute.tsx    # 認証保護
│   ├── CreateOrganizationModal.tsx
│   ├── CreateShopModal.tsx
│   └── ...
├── hooks/                    # カスタムフック
│   ├── useAuth.ts            # 認証
│   ├── useVideos.ts          # 動画データ
│   ├── useUpload.ts          # アップロード
│   ├── useSystemStats.ts     # システム統計
│   ├── useOrganizationStats.ts # 組織統計
│   └── useShopStats.ts       # 販売店統計
├── lib/                      # ユーティリティ
│   ├── api-client.ts         # APIクライアント
│   ├── amplify-config.ts     # Amplify設定
│   └── utils.ts              # ヘルパー関数
└── types/                    # TypeScript型定義
    └── shared.ts             # 共通型
```

## 🔐 セキュリティ

- **Cognito認証**: すべてのページで認証チェック
- **ロールベースアクセス制御**: 各ページで権限チェック
- **HTTPS**: 本番環境では強制HTTPS
- **CORS**: API Gatewayで適切なCORS設定

## 💰 月額コスト見積もり

### 小規模（10組織・100販売店・1,000動画）
- **約 $50-70/月**（約7,000-10,000円）
  - Amplify Hosting: $10
  - Lambda: $10
  - API Gateway: $10
  - DynamoDB: $10
  - S3: $10-30（動画サイズによる）

### 中規模（50組織・500販売店・10,000動画）
- **約 $150-200/月**（約22,000-30,000円）

## 🆘 トラブルシューティング

### デプロイエラー
- Amplifyの環境変数が正しく設定されているか確認
- ビルドログを確認してエラーを特定

### 認証エラー
- Cognitoの設定が正しいか確認
- `.env.local`の環境変数が正しいか確認
- ブラウザのキャッシュをクリア

### API エラー
- API Gatewayのエンドポイントが正しいか確認
- Lambda関数のログをCloudWatchで確認
- CORS設定を確認

## 📝 開発メモ

### コーディング規約
- TypeScriptの型定義を必ず使用
- コンポーネントは機能ごとに分割
- カスタムフックで状態管理ロジックを分離
- `console.log`は開発用に残す（本番でも有用）

### 今後の改善案
- [ ] マルチロール機能の再実装（必要に応じて）
- [ ] 動画プレビュー機能の追加
- [ ] 一括アップロード機能
- [ ] より詳細な統計表示
- [ ] エクスポート機能（CSV・PDF）

## 📞 サポート

質問や問題がある場合は、開発チームにお問い合わせください。

---

**最終更新**: 2025年10月27日  
**バージョン**: 2.0.0  
**ステータス**: 本番稼働準備中
