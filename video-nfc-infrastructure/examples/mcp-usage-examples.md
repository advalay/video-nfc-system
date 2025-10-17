# Claude MCP 使用例集

このドキュメントでは、Claude とMCPサーバーを使用した実践的な使用例を紹介します。

## 📊 データベース操作

### 組織管理

#### 組織一覧を取得
```
ユーザー: 「dev環境の全組織を表示して」

Claude: DynamoDBから組織データを取得します。

MCPツール: dynamodb-manager / list_organizations
パラメータ: { env: "dev" }

結果:
- 株式会社ABC（代理店）- 動画50本、ストレージ2.3GB
- 株式会社XYZ販売店（販売店）- 動画15本、ストレージ0.8GB
...
```

#### 特定の組織を詳細表示
```
ユーザー: 「組織ID "org-12345" の詳細を見せて」

Claude: 組織情報を取得します。

MCPツール: dynamodb-manager / get_organization
パラメータ: { organizationId: "org-12345", env: "dev" }

結果:
{
  "organizationId": "org-12345",
  "organizationName": "株式会社ABC",
  "organizationType": "agency",
  "email": "admin@abc.com",
  "unitPrice": 1200,
  "totalVideos": 50,
  "totalStorage": 2458234880,
  "status": "active"
}
```

#### 代理店のみをフィルタ
```
ユーザー: 「アクティブな代理店だけ表示して」

Claude: 代理店をフィルタして取得します。

MCPツール: dynamodb-manager / list_organizations
パラメータ: {
  organizationType: "agency",
  status: "active",
  env: "dev"
}
```

### 承認申請管理

#### 承認待ち申請を確認
```
ユーザー: 「承認待ちの申請があるか確認して」

Claude: 承認待ちの申請を検索します。

MCPツール: dynamodb-manager / list_pending_approvals
パラメータ: { env: "dev" }

結果:
承認待ちの申請が2件あります:
1. 申請ID: req-abc123
   - 申請タイプ: 代理店登録
   - 申請者: sample@example.com
   - 作成日: 2025-10-15T10:30:00Z

2. 申請ID: req-xyz789
   - 申請タイプ: 販売店登録
   - 申請者: store@example.com
   - 作成日: 2025-10-16T14:20:00Z
```

#### 特定の申請を詳細確認
```
ユーザー: 「申請ID "req-abc123" の内容を教えて」

Claude: 申請の詳細情報を取得します。

MCPツール: dynamodb-manager / get_approval_request
パラメータ: { requestId: "req-abc123", env: "dev" }
```

### 動画管理

#### 組織別の動画一覧
```
ユーザー: 「組織 "org-12345" の動画を最新10件表示して」

Claude: 組織の動画を取得します。

MCPツール: dynamodb-manager / list_videos_by_organization
パラメータ: {
  organizationId: "org-12345",
  limit: 10,
  env: "dev"
}
```

#### 動画の詳細情報
```
ユーザー: 「動画ID "video-abc123" の情報を見せて」

Claude: 動画メタデータを取得します。

MCPツール: dynamodb-manager / get_video_metadata
パラメータ: { videoId: "video-abc123", env: "dev" }
```

## 🔍 データ整合性チェック

### 全体的な整合性チェック
```
ユーザー: 「データベースの整合性をチェックして」

Claude: 全テーブルのデータ整合性をチェックします。

MCPツール: dynamodb-manager / validate_data_integrity
パラメータ: { checkType: "all", env: "dev" }

結果:
データ整合性の問題が見つかりました:

1. 組織 org-xyz789: メールアドレスが未設定
2. 組織 org-store-456: 販売店にparentIdが未設定
3. 申請 req-old123: 有効期限切れ（status: pending）

推奨アクション:
- 組織情報を更新してください
- 期限切れの申請を処理または削除してください
```

### 組織データのみチェック
```
ユーザー: 「組織データの整合性をチェックして」

Claude: 組織テーブルをチェックします。

MCPツール: dynamodb-manager / validate_data_integrity
パラメータ: { checkType: "organizations", env: "dev" }
```

## 🛠 開発ツール

### コード品質管理

#### リンティング実行
```
ユーザー: 「コードをリントして、問題があれば教えて」

Claude: TypeScript型チェックを実行します。

MCPツール: dev-tools / lint_code
パラメータ: { target: "all", fix: false }

結果:
lib/api-stack.ts:45:10 - error TS2304: Cannot find name 'ApiGatwey'.
Did you mean 'ApiGateway'?

修正が必要な箇所が1件見つかりました。
```

#### 自動修正を実行
```
ユーザー: 「リンティングエラーを自動修正して」

Claude: 自動修正を実行します。

MCPツール: dev-tools / lint_code
パラメータ: { target: "all", fix: true }
```

### ビルド管理

#### プロジェクトをビルド
```
ユーザー: 「プロジェクトをビルドして」

Claude: TypeScriptをコンパイルします。

MCPツール: dev-tools / build_project
パラメータ: { target: "all", clean: false }

結果: ビルド完了
```

#### クリーンビルド
```
ユーザー: 「クリーンビルドして」

Claude: 既存のビルド成果物を削除してからビルドします。

MCPツール: dev-tools / build_project
パラメータ: { target: "all", clean: true }
```

### 依存関係管理

#### 古いパッケージをチェック
```
ユーザー: 「古いパッケージがあるか確認して」

Claude: npm outdated を実行します。

MCPツール: dev-tools / check_dependencies
パラメータ: { checkOutdated: true }

結果:
古いパッケージ:
- aws-cdk-lib: 2.110.0 → 2.125.0 (最新)
- typescript: 5.3.0 → 5.4.2 (最新)

更新推奨: 2パッケージ
```

#### 脆弱性をチェック
```
ユーザー: 「セキュリティ脆弱性をチェックして」

Claude: npm audit を実行します。

MCPツール: dev-tools / check_dependencies
パラメータ: { checkVulnerabilities: true }

結果:
脆弱性チェック:
  Critical: 0
  High: 0
  Moderate: 2
  Low: 5

詳細は npm audit で確認してください。
```

### バンドルサイズ分析

#### 全Lambda関数のサイズを確認
```
ユーザー: 「Lambda関数のバンドルサイズを分析して」

Claude: 各Lambda関数のファイルサイズを確認します。

MCPツール: dev-tools / analyze_bundle

結果:
Lambda関数バンドルサイズ分析:
1. createOrganization: 45.32 KB
2. getOrganizations: 38.21 KB
3. approveRequest: 52.18 KB
4. generate-upload-url: 28.45 KB
5. list-videos: 35.67 KB

最大: approveRequest (52.18 KB)
合計: 199.83 KB
```

#### 特定の関数を分析
```
ユーザー: 「createOrganization のサイズを確認して」

Claude: 指定された関数を分析します。

MCPツール: dev-tools / analyze_bundle
パラメータ: { functionName: "createOrganization" }
```

### インフラ検証

#### CDK定義を検証
```
ユーザー: 「dev環境のインフラ定義を検証して」

Claude: CDK synth を実行して検証します。

MCPツール: dev-tools / validate_infrastructure
パラメータ: { env: "dev" }

結果:
インフラ定義の検証完了
環境: dev
問題: なし

スタック:
- VideoNfcStorageStack-dev
- VideoNfcDatabaseStack-dev
- VideoNfcAuthStack-dev
- VideoNfcMainStack-dev
- VideoNfcApiStack-dev
- VideoNfcMonitoringStack-dev
```

## 📊 監視・モニタリング

### Lambda関数の監視

#### エラーログを確認
```
ユーザー: 「createOrganization のエラーログを過去24時間分見せて」

Claude: CloudWatch Logsからエラーを検索します。

MCPツール: monitoring / get_error_logs
パラメータ: {
  functionName: "createOrganization",
  hours: 24,
  limit: 50
}

結果:
エラーログが3件見つかりました:

1. [2025-10-17T08:15:23Z] ERROR: Invalid email format
   Request ID: abc-123-def
   
2. [2025-10-17T10:42:11Z] ERROR: DynamoDB ValidationException
   Request ID: xyz-789-ghi
   
3. [2025-10-17T14:33:05Z] ERROR: Cognito user already exists
   Request ID: mno-456-pqr
```

#### Lambda メトリクスを取得
```
ユーザー: 「createOrganization の過去1時間の実行回数を教えて」

Claude: Lambda実行メトリクスを取得します。

MCPツール: monitoring / get_lambda_metrics
パラメータ: {
  functionName: "createOrganization",
  metricName: "Invocations",
  period: 300
}

結果:
過去1時間の実行回数:
- 08:00-08:05: 12回
- 08:05-08:10: 8回
- 08:10-08:15: 15回
...
合計: 124回
```

#### エラー率を確認
```
ユーザー: 「Lambda関数のエラー率を確認して」

Claude: Errors メトリクスを取得します。

MCPツール: monitoring / get_lambda_metrics
パラメータ: {
  functionName: "createOrganization",
  metricName: "Errors",
  period: 300
}
```

### API Gateway の監視

#### API エラー率を確認
```
ユーザー: 「API Gatewayの4XXエラーを確認して」

Claude: API Gateway メトリクスを取得します。

MCPツール: monitoring / get_api_gateway_metrics
パラメータ: {
  apiId: "your-api-id",
  metricName: "4XXError",
  stage: "dev"
}
```

#### レイテンシーを確認
```
ユーザー: 「APIのレイテンシーを確認して」

Claude: レイテンシーメトリクスを取得します。

MCPツール: monitoring / get_api_gateway_metrics
パラメータ: {
  apiId: "your-api-id",
  metricName: "Latency"
}
```

### DynamoDB の監視

#### 読み取り/書き込みキャパシティ
```
ユーザー: 「video-nfc-Organization-dev テーブルの書き込みキャパシティを確認して」

Claude: DynamoDB メトリクスを取得します。

MCPツール: monitoring / get_dynamodb_metrics
パラメータ: {
  tableName: "video-nfc-Organization-dev",
  metricName: "ConsumedWriteCapacityUnits"
}
```

### アラーム管理

#### アラーム状態を確認
```
ユーザー: 「CloudWatchアラームの状態を確認して」

Claude: アラームの状態を取得します。

MCPツール: monitoring / check_alarms
パラメータ: { alarmPrefix: "video-nfc" }

結果:
アラーム状態サマリー:
- 合計: 8個
- OK: 6個
- ALARM: 1個
- INSUFFICIENT_DATA: 1個

ALARM状態のアラーム:
1. video-nfc-lambda-errors-dev
   理由: Error rate exceeded threshold (>5 errors/5min)
   更新: 2025-10-17T14:45:00Z
```

#### 特定のアラームのみ確認
```
ユーザー: 「ALARM状態のアラームだけ表示して」

Claude: アラームをフィルタします。

MCPツール: monitoring / check_alarms
パラメータ: {
  alarmPrefix: "video-nfc",
  stateValue: "ALARM"
}
```

### ログ検索

#### キーワードでログを検索
```
ユーザー: 「"ValidationException" を含むログを検索して」

Claude: CloudWatch Logsを検索します。

MCPツール: monitoring / search_logs
パラメータ: {
  logGroupName: "/aws/lambda/createOrganization",
  searchTerm: "ValidationException",
  limit: 20
}
```

## 🔄 複合的な操作例

### デプロイ前チェック
```
ユーザー: 「デプロイ前のチェックを全部やって」

Claude: 以下のチェックを順次実行します:

1. コードリンティング
2. プロジェクトビルド
3. 依存関係チェック
4. インフラ定義検証
5. データ整合性チェック

結果:
✓ リンティング: 問題なし
✓ ビルド: 成功
✓ 依存関係: 古いパッケージ2件（更新推奨）
✓ インフラ: 問題なし
✓ データ整合性: 軽微な問題1件

デプロイ可能です！
```

### トラブルシューティング
```
ユーザー: 「createOrganization が動かない。何が問題か調べて」

Claude: 総合的に調査します:

1. エラーログ確認
2. メトリクス確認
3. アラーム状態確認
4. データ整合性チェック

調査結果:
- 過去1時間で15件のエラー
- エラー内容: 「Cognito user already exists」が多い
- 原因: 既存ユーザーのチェック処理が不足
- 推奨: コード修正が必要

修正案:
1. ユーザー存在チェックを追加
2. エラーハンドリングを改善
```

### パフォーマンス分析
```
ユーザー: 「システム全体のパフォーマンスを分析して」

Claude: 複数のメトリクスを収集します:

1. Lambda実行時間
2. API Gateway レイテンシー
3. DynamoDB スループット
4. エラー率

分析結果:
- Lambda平均実行時間: 245ms（良好）
- API レイテンシー: 380ms（改善余地あり）
- DynamoDB: 十分な余裕
- エラー率: 0.8%（許容範囲内）

最適化推奨:
1. API Gatewayキャッシュの有効化
2. Lambda関数のメモリ最適化
```

## 💡 ベストプラクティス

### 定期的なチェック習慣

#### 毎朝の健全性チェック
```
「おはよう！システムの健全性チェックして」
→ アラーム状態、エラーログ、データ整合性を確認
```

#### 開発開始前のチェック
```
「開発を始める前にコードと依存関係をチェックして」
→ リンティング、古いパッケージ、脆弱性を確認
```

#### デプロイ前の最終確認
```
「デプロイ前の最終チェックお願い」
→ ビルド、テスト、インフラ検証を実行
```

### 効率的なデバッグ

#### エラー発生時の初動
```
「[関数名] でエラーが出た。調査して」
→ エラーログ、メトリクス、関連データを総合的に確認
```

#### パフォーマンス問題の特定
```
「[機能名] が遅い。ボトルネックを見つけて」
→ レイテンシー、実行時間、スループットを分析
```

---

これらの例を参考に、あなたのワークフローに合わせてMCPを活用してください！

