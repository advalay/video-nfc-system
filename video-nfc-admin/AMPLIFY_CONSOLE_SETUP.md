# AWS Amplify コンソールセットアップ手順

## 📋 事前準備

以下の情報を手元に用意してください：

```
リポジトリ: advalay/video-nfc-system
ブランチ: main
アプリルート: video-nfc-admin
```

環境変数:
```
NEXT_PUBLIC_API_URL = https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
NEXT_PUBLIC_USER_POOL_ID = ap-northeast-1_gtvMJ70ot
NEXT_PUBLIC_USER_POOL_CLIENT_ID = 6u6eqm9jqhc0vdvhfvto7ji3gg
NEXT_PUBLIC_AWS_REGION = ap-northeast-1
```

## 🚀 ステップバイステップ手順

### ステップ1: Amplifyコンソールを開く

1. AWSコンソールにログイン
2. リージョンを **ap-northeast-1 (東京)** に設定
3. AWS Amplify を検索して開く
4. URL: https://ap-northeast-1.console.aws.amazon.com/amplify/

### ステップ2: 新しいアプリの作成

1. **「ホスティングを使ってみる」** をクリック

2. **Git providerの選択**
   - 「GitHub」を選択
   - 「次へ」をクリック

3. **GitHubの認証**
   - GitHubの認証画面が表示されます
   - 「Authorize AWS Amplify」をクリック
   - パスワードや2FAを求められたら入力

### ステップ3: リポジトリとブランチの選択

1. **リポジトリの選択**
   ```
   Recently updated repositories から選択
   または検索: advalay/video-nfc-system
   ```

2. **ブランチの選択**
   ```
   Branch: main
   ```

3. **モノレポの設定（重要！）**
   - 「モノレポを接続しますか？」で **「はい」を選択**
   - **アプリのルートディレクトリ**: `video-nfc-admin` と入力

4. **「次へ」** をクリック

### ステップ4: ビルド設定の確認

1. **アプリ名**
   ```
   video-nfc-admin
   ```

2. **ビルド設定**
   - 自動的に `amplify.yml` が検出されます
   - そのまま変更せずに進む

3. **環境変数の追加（最重要！）**
   - 「環境変数」セクションを展開
   - 「変数を追加」をクリック
   - 以下を1つずつ追加：

   | キー | 値 |
   |------|-----|
   | `NEXT_PUBLIC_API_URL` | `https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev` |
   | `NEXT_PUBLIC_USER_POOL_ID` | `ap-northeast-1_gtvMJ70ot` |
   | `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | `6u6eqm9jqhc0vdvhfvto7ji3gg` |
   | `NEXT_PUBLIC_AWS_REGION` | `ap-northeast-1` |

4. **「次へ」** をクリック

### ステップ5: 確認とデプロイ

1. **設定の確認**
   - リポジトリ: `advalay/video-nfc-system`
   - ブランチ: `main`
   - アプリルート: `video-nfc-admin`
   - 環境変数: 4つ設定されているか確認

2. **「保存してデプロイ」** をクリック

3. **初回ビルドの開始**
   - 自動的にビルドが開始されます
   - 所要時間: 約5-10分

## 📊 ビルドの進行状況

ビルドは以下のフェーズで進行します：

1. **Provision** (約30秒)
   - ビルド環境の準備

2. **Build** (約3-5分)
   - 依存関係のインストール
   - TypeScript型チェック
   - Next.jsビルド

3. **Deploy** (約1-2分)
   - ビルド成果物をCDNにデプロイ

4. **完了**
   - 緑色のチェックマークが表示されます
   - デプロイURLが表示されます

## 🎯 デプロイ完了後の確認

### 1. URLの確認

デプロイ完了後、以下の形式のURLが発行されます：
```
https://main.d1234567890abcd.amplifyapp.com
```

### 2. アクセステスト

1. URLをブラウザで開く
2. ログイン画面が表示されることを確認
3. 正常に読み込まれるかチェック

### 3. 動作確認

以下の機能をテストします：

- [ ] ログイン機能（Cognito認証）
- [ ] 組織一覧の表示
- [ ] ダッシュボードの表示
- [ ] API通信が正常に動作

## 🔧 トラブルシューティング

### ビルドエラーが発生した場合

1. **ビルドログを確認**
   - Amplifyコンソール → アプリ → 「ビルド」タブ
   - 失敗したビルドをクリック
   - ログの詳細を確認

2. **よくあるエラー**

   **エラー: "Module not found"**
   ```
   原因: 依存関係の問題
   解決策: package.jsonとpackage-lock.jsonを確認
   ```

   **エラー: "Type error"**
   ```
   原因: TypeScriptの型エラー
   解決策: ローカルで npm run type-check を実行
   ```

   **エラー: "Environment variable not found"**
   ```
   原因: 環境変数が設定されていない
   解決策: Amplifyコンソールで環境変数を再確認
   ```

### 環境変数が反映されない場合

1. Amplifyコンソール → アプリ → 「ホスティング」→ 「環境変数」
2. すべての変数が `NEXT_PUBLIC_` で始まっているか確認
3. 値にスペースや改行が含まれていないか確認
4. 再ビルドを実行

### CORS エラーが発生する場合

1. ブラウザの開発者ツール（F12）でエラー内容を確認
2. API GatewayのCORS設定を確認：
   ```typescript
   allowOrigins: [
     'https://*.amplifyapp.com',  // これが含まれているか確認
   ]
   ```
3. バックエンド（CDK）を再デプロイ

## 📱 アプリIDの確認方法

後で環境変数を設定したり、スクリプトを使用する場合に必要です：

1. Amplifyコンソール → アプリを選択
2. URLバーを確認: `.../apps/【ここがアプリID】/...`
3. または「アプリ設定」→「全般」でApp IDを確認

例: `d1234567890abcd`

## 🔄 継続的デプロイの確認

セットアップ完了後、以下のように自動デプロイされます：

1. **Gitにプッシュ**
   ```bash
   git add .
   git commit -m "Update: some feature"
   git push origin main
   ```

2. **自動ビルド開始**
   - GitHubへのプッシュを検知
   - 自動的にビルドが開始

3. **自動デプロイ**
   - ビルド成功後、自動デプロイ
   - 約5-10分で反映

## 📋 チェックリスト

セットアップ完了前に以下を確認してください：

- [ ] GitHubリポジトリが正しく接続されている
- [ ] ブランチが `main` に設定されている
- [ ] モノレポ設定で `video-nfc-admin` が指定されている
- [ ] 環境変数が4つ設定されている
- [ ] 初回ビルドが成功している
- [ ] デプロイURLにアクセスできる
- [ ] ログイン画面が表示される
- [ ] Cognito認証が動作する

## 🎉 完了！

すべてのステップが完了したら、以下のURLで管理画面にアクセスできます：

```
https://main.YOUR_APP_ID.amplifyapp.com
```

問題が発生した場合は、`AMPLIFY_DEPLOY_GUIDE.md` の詳細なトラブルシューティングセクションを参照してください。

---

**最終更新**: 2025年10月
**作成者**: AWS アーキテクトチーム
