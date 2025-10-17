# 🚀 Amplify クイックスタート

管理画面をWeb公開するための最短手順です。

## ✅ 完了したこと

- ✅ `amplify.yml` ビルド設定を作成
- ✅ GitHubにコードをプッシュ
- ✅ API GatewayのCORS設定を更新（Amplifyドメインを許可）
- ✅ バックエンド（CDK）を再デプロイ中

## 🎯 あなたがやること（3ステップ、5分）

### ステップ1: Amplifyコンソールを開く（30秒）

以下のURLを開いてください：
```
https://ap-northeast-1.console.aws.amazon.com/amplify/
```

または：
1. AWSコンソールにログイン
2. リージョン: **東京 (ap-northeast-1)** を選択
3. サービス検索で「Amplify」と入力

### ステップ2: アプリを作成（2分）

1. **「ホスティングを使ってみる」** をクリック

2. **GitHubを選択** → 「次へ」

3. **GitHub認証**
   - 「Authorize AWS Amplify」をクリック

4. **リポジトリを選択**
   - リポジトリ: `advalay/video-nfc-system`
   - ブランチ: `main`
   - モノレポ: **「はい」を選択**
   - アプリルート: `video-nfc-admin` と入力
   - 「次へ」

5. **環境変数を設定（重要！）**

   「環境変数」セクションを展開して、以下を追加：

   ```
   NEXT_PUBLIC_API_URL
   https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev

   NEXT_PUBLIC_USER_POOL_ID
   ap-northeast-1_gtvMJ70ot

   NEXT_PUBLIC_USER_POOL_CLIENT_ID
   6u6eqm9jqhc0vdvhfvto7ji3gg

   NEXT_PUBLIC_AWS_REGION
   ap-northeast-1
   ```

6. **「保存してデプロイ」** をクリック

### ステップ3: デプロイ完了を待つ（5-10分）

ビルドの進行状況が表示されます：
- Provision ✅
- Build 🔄
- Deploy ⏳

すべて緑色のチェックマークになったら完了！

## 🌐 デプロイ完了後

URLが発行されます：
```
https://main.【アプリID】.amplifyapp.com
```

このURLでWeb公開されます！

## 🔍 動作確認

1. URLをブラウザで開く
2. ログイン画面が表示される
3. Cognitoユーザーでログイン
4. 管理画面が使える

## 🎉 これで完了！

今後は `git push` するだけで自動的に更新されます。

---

**問題が発生した場合は `AMPLIFY_CONSOLE_SETUP.md` を参照してください。**
