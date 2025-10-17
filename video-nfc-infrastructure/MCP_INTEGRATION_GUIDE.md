# Claude MCP統合ガイド

## 📖 概要

このプロジェクトは、Claude の Model Context Protocol (MCP) と統合されており、AI支援による開発のクオリティ向上を実現しています。

## 🎯 MCP統合の目的

1. **開発効率の向上**: AWSリソースへの直接アクセスとクエリの簡素化
2. **品質管理の強化**: 自動テスト、リンティング、データ整合性チェック
3. **運用監視の改善**: リアルタイムのメトリクス取得とログ分析
4. **ドキュメント管理**: 自動生成とコードとの同期

## 🛠 実装されたMCPサーバー

### 1. AWS統合サーバー (`aws-integration`)

**目的**: AWSリソースへの標準化されたアクセス

**提供機能**:
- DynamoDBクエリ実行
- Lambda関数の直接呼び出し
- S3オブジェクト一覧取得
- CloudWatch Logsの取得

**使用例**:
```javascript
// DynamoDBからデータ取得
query_dynamodb({
  tableName: "video-nfc-Organization-dev",
  operation: "scan",
  limit: 10
})

// Lambda関数を実行
invoke_lambda({
  functionName: "createOrganization",
  payload: {
    organizationName: "テスト企業",
    email: "test@example.com"
  }
})
```

### 2. DynamoDB管理サーバー (`dynamodb-manager`)

**目的**: DynamoDBの高度な操作とデータ検証

**提供機能**:
- 組織情報の取得・一覧表示
- 承認申請の管理
- 動画メタデータの検索
- データ整合性チェック

**使用例**:
```javascript
// 承認待ち申請を取得
list_pending_approvals({
  env: "dev"
})

// データ整合性をチェック
validate_data_integrity({
  checkType: "all",
  env: "dev"
})
```

### 3. 開発ツールサーバー (`dev-tools`)

**目的**: 開発プロセスの自動化と品質管理

**提供機能**:
- コードリンティング
- プロジェクトビルド
- 依存パッケージチェック
- バンドルサイズ分析
- インフラ定義の検証

**使用例**:
```javascript
// コードをリント
lint_code({
  target: "all",
  fix: true
})

// 依存パッケージをチェック
check_dependencies({
  checkVulnerabilities: true,
  checkOutdated: true
})

// CDK定義を検証
validate_infrastructure({
  env: "dev"
})
```

### 4. 監視サーバー (`monitoring`)

**目的**: システムのパフォーマンスと健全性の監視

**提供機能**:
- Lambda/API Gateway/DynamoDBメトリクス取得
- ログ検索とエラーログ取得
- CloudWatchアラーム状態確認
- パフォーマンス分析

**使用例**:
```javascript
// Lambda関数のエラーログを取得
get_error_logs({
  functionName: "createOrganization",
  hours: 24,
  limit: 50
})

// API Gatewayのメトリクスを取得
get_api_gateway_metrics({
  apiId: "your-api-id",
  metricName: "4XXError",
  period: 300
})
```

## 📦 セットアップ手順

### 1. 依存パッケージのインストール

各MCPサーバーの依存パッケージをインストールします：

```bash
# プロジェクトルートで実行
cd mcp-servers/aws-integration && npm install
cd ../dynamodb-manager && npm install
cd ../dev-tools && npm install
cd ../monitoring && npm install
```

### 2. Cursor での設定

Cursor の設定ファイル (`.cursor/settings.json`) にMCP設定を追加します：

```json
{
  "mcp": {
    "configFile": "./mcp-config.json"
  }
}
```

または、Cursorの設定UIから：
1. `Cursor Settings` を開く
2. `Features` → `Model Context Protocol` を有効化
3. 設定ファイルパスに `./mcp-config.json` を指定

### 3. 環境変数の設定

`.env` ファイルにAWS認証情報が設定されていることを確認：

```bash
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=271633506783
```

### 4. MCPサーバーの起動確認

各サーバーが正しく起動するかテスト：

```bash
# AWS統合サーバー
node mcp-servers/aws-integration/index.js

# DynamoDB管理サーバー
node mcp-servers/dynamodb-manager/index.js
```

## 🚀 使用方法

### Claudeとの対話で使用

Claudeに対して、以下のような質問や指示ができます：

**データベース操作**:
```
「dev環境の組織一覧を表示して」
「承認待ちの申請を確認して」
「データ整合性をチェックして」
```

**開発ツール**:
```
「コードをリントして」
「プロジェクトをビルドして」
「古いパッケージがあるか確認して」
```

**監視・分析**:
```
「過去24時間のエラーログを確認して」
「Lambda関数のパフォーマンスを分析して」
「アラームの状態を確認して」
```

### プログラムから直接使用

MCPサーバーはstdio経由で通信するため、Node.jsスクリプトから直接呼び出すこともできます：

```javascript
const { spawn } = require('child_process');

const mcp = spawn('node', ['mcp-servers/aws-integration/index.js']);

// リクエストを送信
mcp.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'query_dynamodb',
    arguments: {
      tableName: 'video-nfc-Organization-dev',
      operation: 'scan'
    }
  },
  id: 1
}));

// レスポンスを受信
mcp.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});
```

## 🔐 セキュリティ考慮事項

1. **AWS認証情報**: MCPサーバーは環境変数またはAWS認証情報ファイルを使用します。本番環境では適切なIAMロールを設定してください。

2. **アクセス制限**: MCPサーバーは強力な権限を持つため、信頼できる環境でのみ使用してください。

3. **ログ管理**: 機密情報がログに記録されないよう注意してください。

## 📈 活用シーン

### 1. 開発中

- **リアルタイムデータ確認**: DynamoDBのデータをClaudeに確認させながらコーディング
- **即座のバリデーション**: コード変更後すぐにリンティングと型チェック
- **依存関係管理**: パッケージの更新や脆弱性を継続的にチェック

### 2. デバッグ時

- **エラーログ分析**: Claudeがエラーログを分析し、原因を特定
- **メトリクス確認**: パフォーマンス問題の原因を数値で確認
- **データ整合性チェック**: データの矛盾を自動検出

### 3. 運用監視

- **異常検知**: メトリクスやログから異常を早期発見
- **パフォーマンス最適化**: ボトルネックを特定し改善提案
- **アラート対応**: アラーム発火時の原因調査を支援

## 🔄 今後の拡張予定

### 短期（1ヶ月以内）
- [ ] テストフレームワーク統合（Jest/Mocha）
- [ ] CI/CDパイプライン統合
- [ ] OpenAPI仕様の自動生成

### 中期（3ヶ月以内）
- [ ] コスト最適化アドバイザー
- [ ] セキュリティスキャナー統合
- [ ] パフォーマンスベンチマーク自動実行

### 長期（6ヶ月以内）
- [ ] 機械学習による異常検知
- [ ] 自動修復機能
- [ ] マルチリージョン対応

## 🤝 コントリビューション

MCPサーバーの機能追加や改善提案は歓迎します！

### 新しいツールの追加方法

1. 既存のMCPサーバーまたは新しいサーバーファイルを編集
2. `ListToolsRequestSchema` ハンドラーに新しいツール定義を追加
3. `CallToolRequestSchema` ハンドラーにツール実装を追加
4. このドキュメントを更新

## 📚 参考リンク

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Claude API Documentation](https://docs.anthropic.com/)

## 💡 ベストプラクティス

1. **小さく始める**: まず1つのMCPサーバーから使い始める
2. **段階的な統合**: 既存のワークフローに少しずつ統合
3. **フィードバック収集**: チーム全体で効果を確認し改善
4. **ドキュメント維持**: 新機能追加時は必ずドキュメント更新

## 🆘 トラブルシューティング

### MCPサーバーが起動しない

```bash
# 依存パッケージを再インストール
cd mcp-servers/[サーバー名]
rm -rf node_modules package-lock.json
npm install
```

### AWS認証エラー

```bash
# AWS認証情報を確認
aws sts get-caller-identity

# 必要に応じて再設定
aws configure
```

### パフォーマンスが遅い

- MCPサーバーのログを確認
- AWS API呼び出し回数を削減（キャッシュ活用）
- 並列実行を検討

---

**作成日**: 2025年10月17日  
**バージョン**: 1.0.0  
**メンテナー**: 開発チーム

