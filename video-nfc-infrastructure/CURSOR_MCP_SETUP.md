# Cursor でのMCP設定手順

このガイドでは、CursorでMCP（Model Context Protocol）を有効化し、使い始めるまでの手順を説明します。

## ✅ 完了した準備

以下の準備は既に完了しています：

- ✅ MCPサーバーの実装（4つのサーバー）
- ✅ 依存パッケージのインストール
- ✅ 設定ファイルの作成（`.cursor/mcp-config.json`）
- ✅ 実行権限の設定

## 🎯 Cursorでの設定手順

### 方法1: 設定UIから（推奨）

1. **Cursorを開く**

2. **設定を開く**
   - Mac: `⌘ + ,`（Command + カンマ）
   - Windows/Linux: `Ctrl + ,`

3. **MCP設定を有効化**
   - 設定画面で「Features」を選択
   - 「Model Context Protocol」または「MCP」を検索
   - 「Enable Model Context Protocol」にチェック

4. **設定ファイルのパスを指定**
   - 「MCP Config File Path」欄に以下のいずれかを入力：
     ```
     /Users/kosuke/video-nfc-infrastructure/.cursor/mcp-config.json
     ```
     または
     ```
     .cursor/mcp-config.json
     ```

5. **Cursorを再起動**
   - Cursor を完全に終了
   - Cursor を再度起動

### 方法2: 設定ファイルから

Cursorのユーザー設定ファイルを直接編集する場合：

1. **設定ファイルを開く**
   - `~/Library/Application Support/Cursor/User/settings.json`（Mac）
   - `%APPDATA%\Cursor\User\settings.json`（Windows）

2. **以下を追加**
   ```json
   {
     "mcp": {
       "enabled": true,
       "configFile": "/Users/kosuke/video-nfc-infrastructure/.cursor/mcp-config.json"
     }
   }
   ```

3. **ファイルを保存し、Cursorを再起動**

## 🧪 動作確認

Cursorを再起動した後、以下のテストを実行して正しく動作するか確認してください：

### テスト1: 基本的なクエリ
```
「dev環境の組織一覧を表示して」
```

**期待される動作：**
- ClaudeがMCPサーバー（dynamodb-manager）を使用
- DynamoDBから組織データを取得
- 組織の一覧が表示される

### テスト2: コードチェック
```
「TypeScriptコードをリントして」
```

**期待される動作：**
- ClaudeがMCPサーバー（dev-tools）を使用
- TypeScript型チェックを実行
- 問題があれば報告される

### テスト3: ログ確認
```
「過去1時間のエラーログを確認して」
```

**期待される動作：**
- ClaudeがMCPサーバー（monitoring）を使用
- CloudWatch Logsを検索
- エラーログが表示される（あれば）

## ✅ 成功の確認方法

MCPが正常に動作している場合、以下のような応答が返ってきます：

```
Claude: DynamoDBから組織データを取得します。

[MCPツールを実行中...]

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

**症状：**
- Claudeが通常の応答しか返さない
- MCPツールを使用していない

**解決策：**

1. **設定ファイルのパスを確認**
   ```bash
   ls -la /Users/kosuke/video-nfc-infrastructure/.cursor/mcp-config.json
   ```
   ファイルが存在することを確認

2. **Cursorの設定を確認**
   - Cursor Settings → Features → MCP が有効化されているか確認
   - 設定ファイルパスが正しいか確認

3. **Cursorを完全に再起動**
   - Cursorを完全に終了（Cmd+Qまたは右クリック→終了）
   - 再度起動

### AWS認証エラー

**症状：**
- 「AWS credentials not found」などのエラーメッセージ

**解決策：**

1. **AWS認証情報を確認**
   ```bash
   aws sts get-caller-identity
   ```

2. **必要に応じて設定**
   ```bash
   aws configure
   ```
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `ap-northeast-1`

### 依存パッケージエラー

**症状：**
- 「Cannot find module」などのエラー

**解決策：**

```bash
cd /Users/kosuke/video-nfc-infrastructure
./scripts/setup-mcp.sh
```

### Claudeが質問を理解しない

**症状：**
- MCPを使わずに一般的な回答を返す

**解決策：**
- より具体的な質問をする
- 例：「組織」→「dev環境のDynamoDBから組織一覧を取得して」

## 📚 利用可能なMCPサーバー

### 1. AWS統合サーバー (`aws-integration`)
- DynamoDBクエリ実行
- Lambda関数呼び出し
- S3オブジェクト一覧取得
- CloudWatch Logs取得

### 2. DynamoDB管理サーバー (`dynamodb-manager`)
- 組織情報の取得・一覧表示
- 承認申請の管理
- 動画メタデータの検索
- データ整合性チェック

### 3. 開発ツールサーバー (`dev-tools`)
- コードリンティング
- プロジェクトビルド
- 依存関係チェック
- インフラ定義の検証

### 4. 監視サーバー (`monitoring`)
- Lambda/API Gateway/DynamoDBメトリクス取得
- ログ検索とエラーログ取得
- CloudWatchアラーム状態確認

## 💡 使い方のヒント

### 1. 具体的に質問する

❌ 悪い例：
```
「データを見せて」
```

✅ 良い例：
```
「dev環境のvideo-nfc-Organization-devテーブルから全組織を取得して」
```

### 2. コンテキストを提供する

❌ 悪い例：
```
「エラーがある」
```

✅ 良い例：
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

## 📖 詳細ドキュメント

より詳しい情報は以下のドキュメントを参照してください：

- **[MCP_QUICKSTART.md](./MCP_QUICKSTART.md)** - クイックスタートガイド
- **[MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md)** - 詳細な統合ガイド
- **[examples/mcp-usage-examples.md](./examples/mcp-usage-examples.md)** - 豊富な使用例

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

---

**準備完了！** Claudeと一緒に、より効率的な開発を始めましょう 🚀




