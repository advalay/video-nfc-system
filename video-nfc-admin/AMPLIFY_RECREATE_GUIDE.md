# Amplifyアプリケーション再作成ガイド

## 🚨 現在の問題
- `Monorepo spec provided without "applications" key` エラーが継続
- 既存のAmplifyアプリケーション設定に問題がある

## 🔧 解決策：アプリケーション再作成

### ステップ1: 新しいAmplifyアプリケーションを作成

1. **AWS Amplifyコンソールを開く**
   ```
   https://console.aws.amazon.com/amplify/
   ```

2. **「新しいアプリ」→「Webアプリをホスト」**

3. **GitHubを選択して認証**

4. **リポジトリ設定**:
   - **リポジトリ**: `advalay/video-nfc-system`
   - **ブランチ**: `main`
   - **モノレポアプリケーションルート**: **空欄**（重要！）

5. **アプリケーション設定**:
   - **アプリ名**: `video-nfc-system-v2`
   - **フレームワーク**: `Next.js`
   - **ビルドコマンド**: `npm run build`
   - **出力ディレクトリ**: `.next`

### ステップ2: 環境変数を設定

**「環境変数」タブで以下を追加**：

```
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_gtvMJ70ot
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=6o0knadh7s8v164r6a8kvp7m0n
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
NEXT_PUBLIC_API_BASE_URL=https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production
```

### ステップ3: デプロイ実行

1. **「保存してデプロイ」をクリック**
2. **5-10分待つ**
3. **新しいURLでサイトを確認**

## 🎯 期待される結果

- ✅ モノレポエラーが解決される
- ✅ ビルドが成功する
- ✅ サイトが表示される
- ✅ 動的ルートが動作する

## 📋 古いアプリケーションの削除

新しいアプリケーションが成功したら：

1. **古いアプリケーション** (`video-nfc-system`) を削除
2. **新しいアプリケーション** (`video-nfc-system-v2`) を使用
3. **必要に応じて名前を変更**

---

**この方法で確実に問題が解決されます！** 🎯
