# Video NFC Admin System 🎬

非エンジニアでも簡単に運用・更新できる動画管理システム

## 📚 ドキュメント一覧

### 🚀 デプロイ・運用

1. **[NON_ENGINEER_GUIDE.md](./NON_ENGINEER_GUIDE.md)** ⭐️ **まずはここから！**
   - あなたのタスク一覧
   - AWS Amplifyでの公開手順
   - 日常的な確認事項
   - トラブルシューティング

2. **[QUICK_UPDATE_GUIDE.md](./QUICK_UPDATE_GUIDE.md)** ⭐️ **よく使う！**
   - テキスト変更（5分）
   - 画像変更（5分）
   - 色の変更（5分）
   - 実践例とチェックリスト

3. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
   - AWS Amplify詳細設定
   - カスタムドメイン設定
   - セキュリティ設定
   - コスト見積もり

4. **[ENV_VARIABLES.md](./ENV_VARIABLES.md)**
   - 環境変数の設定方法
   - 取得済みの認証情報
   - トラブルシューティング

5. **[UPDATE_ENVIRONMENT.md](./UPDATE_ENVIRONMENT.md)**
   - 更新しやすい環境の説明
   - 今後追加すべき機能
   - 運用フロー
   - 学習リソース

## 🎯 クイックスタート（初回のみ・15分）

### ステップ1: AWSにログイン
```
https://console.aws.amazon.com/amplify/
```

### ステップ2: 新しいアプリを作成
1. 「新しいアプリ」→「Webアプリをホスト」
2. GitHubを選択して認証
3. リポジトリ: `company-search-system`
4. ブランチ: `main`
5. モノレポルート: `video-nfc-admin`

### ステップ3: 環境変数を設定
[ENV_VARIABLES.md](./ENV_VARIABLES.md)を参照して6つの環境変数を設定

### ステップ4: デプロイ実行
「保存してデプロイ」をクリック → 5-10分待つ

### ステップ5: 動作確認
発行されたURLでサイトを開く

**詳細は [NON_ENGINEER_GUIDE.md](./NON_ENGINEER_GUIDE.md) を参照**

---

## 🔄 日常的な更新（5分）

### テキストを変更
1. GitHubでファイルを開く
2. 編集ボタン（✏️）をクリック
3. テキストを変更
4. 「Commit changes」をクリック
5. 5-10分で本番反映

### 画像を変更
1. GitHubで画像フォルダを開く
2. 新しい画像をアップロード
3. 5-10分で本番反映

**詳細は [QUICK_UPDATE_GUIDE.md](./QUICK_UPDATE_GUIDE.md) を参照**

---

## 🛡️ 安全な更新方法

### ロールバック（元に戻す）
1. Amplifyコンソールを開く
2. 「ビルド履歴」タブをクリック
3. 成功した前のビルドを選択
4. 「再デプロイ」をクリック
5. 5分で元の状態に戻る

### テスト環境で試す（推奨）
1. GitHubで`test`ブランチを作成
2. Amplifyで`test`ブランチを接続
3. テスト用URLで確認
4. OKなら本番に反映

---

## 📊 システム構成

### フロントエンド
- **Next.js 15** - React フレームワーク
- **Tailwind CSS** - スタイリング
- **AWS Amplify Hosting** - ホスティング

### バックエンド
- **AWS API Gateway** - REST API
- **AWS Lambda** - サーバーレス関数
- **Amazon DynamoDB** - データベース
- **Amazon S3** - 動画ストレージ
- **Amazon Cognito** - 認証

### CI/CD
- **GitHub** - ソースコード管理
- **AWS Amplify** - 自動デプロイ

---

## 💰 月額コスト

### 10,000ユーザー想定
- **約$90/月**（約13,000円）
  - Amplify Hosting: $15
  - CloudFront: $20
  - Lambda: $10
  - API Gateway: $15
  - DynamoDB: $25
  - CloudWatch: $5

### 100,000ユーザー想定
- **約$300-400/月**（約45,000円）

---

## 🆘 困ったときは

### よくある質問

**Q: デプロイが失敗しました**
→ [NON_ENGINEER_GUIDE.md](./NON_ENGINEER_GUIDE.md) の「トラブルシューティング」を参照

**Q: サイトの表示がおかしいです**
→ ブラウザのキャッシュをクリア（Cmd+Shift+R / Ctrl+Shift+R）

**Q: 変更を元に戻したいです**
→ Amplifyコンソールでロールバック

**Q: テキストを変更したいです**
→ [QUICK_UPDATE_GUIDE.md](./QUICK_UPDATE_GUIDE.md) を参照

### サポート

**自分で対応できる**:
- ✅ テキスト・画像変更
- ✅ ロールバック
- ✅ デプロイ確認

**エンジニアに依頼**:
- 🔧 新機能追加
- 🔧 データベース変更
- 🔧 API変更

**すぐに連絡が必要**:
- 🚨 サイトダウン（30分以上）
- 🚨 セキュリティ警告
- 🚨 データ消失

---

## 📞 重要なリンク

### AWS
- [Amplifyコンソール](https://console.aws.amazon.com/amplify/)
- [DynamoDBコンソール](https://console.aws.amazon.com/dynamodb/)
- [Cognito コンソール](https://console.aws.amazon.com/cognito/)
- [料金計算ツール](https://calculator.aws/)

### GitHub
- [リポジトリ](https://github.com/advalay/company-search-system)
- [変更履歴](https://github.com/advalay/company-search-system/commits/main)

### ドキュメント
- [AWS Amplify公式](https://docs.amplify.aws/)
- [Next.js公式](https://nextjs.org/docs)

---

## ✅ チェックリスト

### 初回セットアップ
- [ ] AWSアカウント作成
- [ ] GitHub連携
- [ ] Amplifyアプリ作成
- [ ] 環境変数設定（6つ）
- [ ] 初回デプロイ成功
- [ ] 動作確認完了
- [ ] カスタムドメイン設定（オプション）

### 日常運用
- [ ] 毎日：サイト動作確認
- [ ] 毎週：エラーログ確認
- [ ] 毎週：コスト確認
- [ ] 毎月：ユーザー数確認
- [ ] 毎月：バックアップ確認

---

## 🎓 このシステムの特徴

### ✨ 非エンジニアに優しい
- GitHubで直接編集できる
- 自動デプロイで手間いらず
- 1クリックでロールバック可能

### 🔒 セキュア
- AWS Cognito認証
- HTTPS自動対応
- セキュリティヘッダー設定済み

### ⚡️ 高速
- CloudFront CDN
- Next.js最適化
- 画像自動圧縮

### 💰 コスト効率
- サーバーレスアーキテクチャ
- 使った分だけ課金
- スケール自動調整

---

## 📝 更新履歴

### 2025-10-16
- ✅ 本番デプロイ環境構築
- ✅ 非エンジニア向けガイド作成
- ✅ 自動デプロイ設定完了
- ✅ セキュリティヘッダー設定

---

**このREADMEを印刷して、デスクに置いておくことをおすすめします！** 📖✨

何か困ったことがあれば、まず [NON_ENGINEER_GUIDE.md](./NON_ENGINEER_GUIDE.md) を読んでください。
