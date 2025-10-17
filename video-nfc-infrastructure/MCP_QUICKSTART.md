# Claude MCP 統合 - クイックスタートガイド

このガイドでは、5分でClaude MCPを使い始める方法を説明します。

## 📦 ステップ1: セットアップ

### 自動セットアップ（推奨）

```bash
# プロジェクトルートで実行
./scripts/setup-mcp.sh
```

このスクリプトは以下を自動的に実行します：
- ✅ MCPサーバーの依存パッケージをインストール
- ✅ 実行権限を設定
- ✅ 動作確認

### 手動セットアップ

```bash
# 各MCPサーバーの依存関係をインストール
npm run mcp:install

# または個別に
cd mcp-servers/aws-integration && npm install
cd ../dynamodb-manager && npm install
cd ../dev-tools && npm install
cd ../monitoring && npm install
```

## 🔧 ステップ2: Cursor設定

### 方法A: 設定UIから（推奨）

1. **Cursor を開く**
2. `⌘ ,` (Mac) または `Ctrl ,` (Windows) で設定を開く
3. `Features` → `Model Context Protocol` を検索
4. `Enable Model Context Protocol` をオン
5. `MCP Config File Path` に `./mcp-config.json` を入力
6. **Cursorを再起動**

### 方法B: 設定ファイルから

`.cursor/settings.json` を編集：

```json
{
  "mcp": {
    "enabled": true,
    "configFile": "./mcp-config.json"
  }
}
```

## 🎯 ステップ3: 動作確認

Claudeとの会話で以下を試してみてください：

### テスト1: データベースクエリ
```
「dev環境の組織一覧を表示して」
```

期待される動作：
- Claude がMCPサーバーを使用してDynamoDBからデータを取得
- 組織一覧が表示される

### テスト2: コードチェック
```
「コードをリントして」
```

期待される動作：
- Claude が TypeScript 型チェックを実行
- 問題があれば報告される

### テスト3: ログ確認
```
「過去1時間のエラーログを確認して」
```

期待される動作：
- Claude が CloudWatch Logs を検索
- エラーログが表示される（あれば）

## ✅ 成功の確認

以下のような応答が返ってくればMCPは正常に動作しています：

```
Claude: DynamoDBから組織データを取得します。

[MCPツール実行中...]

結果:
1. 株式会社ABC（代理店）
   - 動画: 50本
   - ストレージ: 2.3GB
   - ステータス: アクティブ

2. XYZ販売店（販売店）
   - 動画: 15本
   - ストレージ: 0.8GB
   - ステータス: アクティブ
```

## 🚨 トラブルシューティング

### MCPサーバーが認識されない

**原因**: 設定ファイルのパスが間違っている

**解決策**:
```bash
# mcp-config.json が存在するか確認
ls -la mcp-config.json

# Cursorの設定を確認
cat .cursor/mcp-config.json
```

### AWS認証エラー

**原因**: AWS認証情報が設定されていない

**解決策**:
```bash
# AWS認証情報を確認
aws sts get-caller-identity

# 必要に応じて設定
aws configure
```

### 依存パッケージエラー

**原因**: MCPサーバーの依存関係がインストールされていない

**解決策**:
```bash
# 再インストール
./scripts/setup-mcp.sh

# または
npm run mcp:install
```

### Claude が MCP を使わない

**原因**: Claudeが自然言語での質問を認識していない

**解決策**:
- より具体的な質問をする
- 例: 「組織」→「dev環境のDynamoDBから組織一覧を取得して」

## 📚 次のステップ

### 基本的な使い方を学ぶ

[`examples/mcp-usage-examples.md`](./examples/mcp-usage-examples.md) を参照してください。豊富な使用例が掲載されています。

### 詳細ガイドを読む

[`MCP_INTEGRATION_GUIDE.md`](./MCP_INTEGRATION_GUIDE.md) でMCPの詳細と高度な使い方を確認できます。

### 利用可能なツールを確認

#### AWS統合サーバー
- `query_dynamodb` - DynamoDBクエリ
- `invoke_lambda` - Lambda関数実行
- `list_s3_objects` - S3オブジェクト一覧
- `get_cloudwatch_logs` - ログ取得

#### DynamoDB管理サーバー
- `get_organization` - 組織情報取得
- `list_organizations` - 組織一覧
- `list_pending_approvals` - 承認待ち一覧
- `validate_data_integrity` - データ整合性チェック

#### 開発ツールサーバー
- `lint_code` - コードリンティング
- `build_project` - プロジェクトビルド
- `check_dependencies` - 依存関係チェック
- `validate_infrastructure` - インフラ検証

#### 監視サーバー
- `get_error_logs` - エラーログ取得
- `get_lambda_metrics` - Lambdaメトリクス
- `check_alarms` - アラーム状態確認
- `search_logs` - ログ検索

## 💡 使い方のコツ

### 1. 具体的に質問する

❌ 悪い例:
```
「データを見せて」
```

✅ 良い例:
```
「dev環境のvideo-nfc-Organization-devテーブルから全組織を取得して」
```

### 2. コンテキストを提供する

❌ 悪い例:
```
「エラーがある」
```

✅ 良い例:
```
「createOrganization 関数で過去24時間のエラーログを確認して」
```

### 3. 段階的に進める

複雑な操作は分割して実行：

```
ステップ1: 「コードをリントして」
ステップ2: 「エラーがあれば修正方法を提案して」
ステップ3: 「修正後、もう一度リントして」
```

## 🎉 よく使う質問集

### 毎日の健全性チェック
```
「システムの健全性をチェックして」
「今日のエラーログを確認して」
「アラームの状態を教えて」
```

### 開発時
```
「コードをリントして」
「プロジェクトをビルドして」
「インフラ定義を検証して」
```

### デバッグ時
```
「[関数名] のエラーログを見せて」
「[関数名] の過去1時間のメトリクスを確認して」
「データ整合性をチェックして」
```

### データ確認
```
「組織一覧を表示して」
「承認待ちの申請を確認して」
「組織 [ID] の詳細を見せて」
```

## 🔄 アップデート

MCP機能は継続的に改善されています。最新版を取得するには：

```bash
# プロジェクトルートで
git pull origin main

# MCPサーバーを更新
./scripts/setup-mcp.sh
```

## 📞 サポート

問題が解決しない場合：

1. [`MCP_INTEGRATION_GUIDE.md`](./MCP_INTEGRATION_GUIDE.md) のトラブルシューティングセクションを確認
2. [`examples/mcp-usage-examples.md`](./examples/mcp-usage-examples.md) で類似の例を探す
3. 開発チームに連絡

---

**準備完了！** Claudeと一緒に、より効率的な開発を始めましょう 🚀

