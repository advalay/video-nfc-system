# 公開リリース作業計画

作成日: 2025-01-02
最終更新: 2025-01-02

## 📋 作業概要

本ドキュメントは、Video NFC Adminシステムを本番環境へ公開するための詳細な作業計画です。
**目標リリース日: 48時間以内**

---

## 🎯 最終確認項目（最優先）

### ✅ 完了済み項目
- [x] Amplifyビルド成功
- [x] 動画アップロードURL修正（本番URL）
- [x] 動画一覧表示改善（タイトル + ファイル名）
- [x] 動画IDモーダル表示
- [x] システム管理者の組織統計API呼び出し修正
- [x] 販売店作成時のメール重複チェック実装
- [x] 動画削除機能のアクセス権限修正（組織管理者対応）
- [x] 動画削除時間制限の変更（48時間 → 24時間）

---

## 🔥 緊急対応が必要な項目（24時間以内）

### 1. 動画アップロード機能の本番環境テスト
**所要時間**: 30分  
**優先度**: ★★★★★（最高）

#### テスト手順
```bash
# 1. 本番環境にアクセス
# https://main.d3vnoskfyyh2d2.amplifyapp.com

# 2. 販売店アカウントでログイン
# メール: kimura@example.com
# パスワード: （最新のパスワードを確認）

# 3. 動画アップロード実行
- アップロードページに移動
- テスト用MP4ファイル（1-2MB）を選択
- タイトルを入力
- アップロード開始
- ブラウザコンソールでログ確認
```

#### 確認ポイント
- [ ] アップロード成功メッセージが表示される
- [ ] 動画一覧に新しい動画が表示される
- [ ] 動画が正常に再生できる
- [ ] S3バケットにファイルが保存されている
- [ ] DynamoDBにメタデータが保存されている

#### エラー時の対応
```bash
# CloudWatch Logs確認
aws logs tail /aws/lambda/video-nfc-api-prod-GenerateUploadUrlFn --follow

# S3バケット確認
aws s3 ls s3://video-nfc-videos-prod-271633506783/
```

---

### 2. 全ユーザーロールでの動作確認
**所要時間**: 1時間  
**優先度**: ★★★★★

#### テストアカウント

##### システム管理者
```
メール: system-admin@example.com
パスワード: AdminPass123!
```

##### 組織管理者（パートナー企業A）
```
メール: orga-admin@example.com
パスワード: （最新のパスワードを確認）
```

##### 販売店管理者（木村販売店）
```
メール: kimura@example.com
パスワード: （最新のパスワードを確認）
```

#### テスト項目

##### システム管理者
- [ ] ログイン成功
- [ ] ダッシュボード表示
- [ ] システム統計ページ表示
- [ ] 組織管理ページ表示
- [ ] 動画一覧表示（全14件）
- [ ] 組織作成機能
- [ ] 販売店作成機能
- [ ] 販売店パスワードリセット機能

##### 組織管理者
- [ ] ログイン成功
- [ ] 左サイドバーに組織名表示
- [ ] 自社管理ページ表示（自分の組織のみ）
- [ ] 販売店統計ページ表示
- [ ] 動画一覧表示（自分の組織のみ）
- [ ] 販売店作成機能
- [ ] アップロードページで制限メッセージ表示
- [ ] システム統計ページアクセス拒否確認

##### 販売店管理者
- [ ] ログイン成功
- [ ] 左サイドバーに店舗名表示
- [ ] 販売店統計ページ表示（自分の店舗のみ）
- [ ] 動画一覧表示（自分の店舗のみ）
- [ ] 動画アップロード機能
- [ ] 動画削除機能（24時間以内の動画）
- [ ] 組織管理ページアクセス拒否確認

---

### 3. デバッグコードの削除
**所要時間**: 30分  
**優先度**: ★★★★☆

#### 対象ファイル
- [ ] `hooks/useUpload.ts` - 7箇所の`console.log`削除
- [ ] `app/shop/stats/page.tsx` - 2箇所削除
- [ ] `app/admin/organizations/page.tsx` - 2箇所削除
- [ ] `hooks/useAuth.ts` - 5箇所削除
- [ ] `hooks/useOrganizationStats.ts` - 2箇所削除
- [ ] `app/login/page.tsx` - 2箇所削除

#### 作業手順
```bash
cd /Users/kosuke/video-nfc-admin

# 検索して確認
grep -r "console\\.log" hooks/ app/ --include="*.ts" --include="*.tsx"

# 削除またはconsole.errorに変更
# 機密情報（トークン、署名付きURL）の出力は必ず削除

# ビルドテスト
npm run build

# コミット & プッシュ
git add .
git commit -m "chore: Remove debug console.log statements for production"
git push origin main
```

---

## 📋 中優先度の項目（48時間以内）

### 4. パスワードリセット機能のテスト
**所要時間**: 15分  
**優先度**: ★★★☆☆

#### テスト手順
1. 組織管理者またはシステム管理者でログイン
2. 組織管理ページで販売店一覧を表示
3. 任意の販売店の🔑アイコンをクリック
4. 「パスワードリセット」ボタンをクリック
5. 確認ダイアログで「はい」をクリック
6. 成功メッセージを確認
7. 販売店のメールアドレス（Cognito User Pool）でリセットメールを受信確認

---

### 5. エラーハンドリングの確認
**所要時間**: 30分  
**優先度**: ★★★☆☆

#### 確認項目
- [ ] ネットワークエラー時の表示（DevToolsでオフライン設定）
- [ ] 認証エラー時のリダイレクト（ログアウト状態でページアクセス）
- [ ] API エラー時のメッセージ表示
- [ ] 無効なファイル形式でのアップロード試行
- [ ] 大きすぎるファイル（>50MB）のアップロード試行

---

### 6. 環境変数の確認
**所要時間**: 10分  
**優先度**: ★★☆☆☆

#### Amplify Consoleでの確認
```bash
# 環境変数の値を確認
NEXT_PUBLIC_API_BASE_URL=https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_tRsVTmwXn
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
NEXT_PUBLIC_APP_ENV=production
```

#### 確認方法
```javascript
// ブラウザコンソールで確認
console.log(process.env.NEXT_PUBLIC_API_BASE_URL);
console.log(window.location.origin);
```

---

## 🔒 セキュリティチェック

### 7. セキュリティ設定の確認
**所要時間**: 30分  
**優先度**: ★★★★☆

#### 確認項目
- [ ] CORS設定確認（現在`*`、本番では制限推奨）
- [ ] S3バケットのパブリックアクセス確認（BLOCK_ALL）
- [ ] Cognito User PoolのMFA設定確認
- [ ] Lambda環境変数の暗号化確認
- [ ] API Gatewayの認証設定確認

---

## 📊 パフォーマンス確認

### 8. レスポンス時間の測定
**所要時間**: 20分  
**優先度**: ★★☆☆☆

#### 測定項目
- [ ] ダッシュボード読み込み時間（目標: <3秒）
- [ ] 動画一覧読み込み時間（目標: <3秒）
- [ ] 統計ページ読み込み時間（目標: <3秒）
- [ ] 動画アップロード進捗表示

#### 測定方法
```javascript
// Chrome DevTools Performance タブを使用
// Network タブで各リクエストの時間を確認
```

---

## 📝 データベース状態確認

### 9. DynamoDBデータの整合性確認
**所要時間**: 20分  
**優先度**: ★★★☆☆

#### 確認項目
- [ ] Organizationテーブルのデータ数（目標: 3件）
- [ ] Shopテーブルのデータ数（目標: 5件）
- [ ] VideoMetadataテーブルのデータ数（目標: 14件）
- [ ] Cognito User Poolのユーザー数（目標: 6件）
- [ ] 組織と販売店の関連が正しいか

#### コマンド
```bash
# Organization確認
aws dynamodb scan --table-name video-nfc-Organization-prod --region ap-northeast-1

# Shop確認
aws dynamodb scan --table-name video-nfc-Shop-prod --region ap-northeast-1

# VideoMetadata確認
aws dynamodb scan --table-name video-nfc-VideoMetadata-prod --region ap-northeast-1

# Cognito確認
aws cognito-idp list-users --user-pool-id ap-northeast-1_tRsVTmwXn --region ap-northeast-1
```

---

## 🚀 デプロイメント確認

### 10. 最終デプロイメント確認
**所要時間**: 15分  
**優先度**: ★★★★☆

#### 確認項目
- [ ] Amplifyビルドが成功しているか
- [ ] Lambda関数が正しくデプロイされているか（23個）
- [ ] API Gatewayのエンドポイントが正常か
- [ ] CloudWatch Logsにエラーがないか

#### コマンド
```bash
# Amplifyステータス確認
aws amplify get-app --app-id d3vnoskfyyh2d2 --region ap-northeast-1

# Lambda関数一覧確認
aws lambda list-functions --region ap-northeast-1 | grep video-nfc-api

# CloudWatch Logs確認
aws logs tail /aws/lambda/video-nfc-api-prod --since 1h --follow
```

---

## ⏰ タイムライン

### Day 1（今日）- 機能検証
- **10:00-10:30** - 動画アップロード機能テスト（本番環境）
- **10:30-11:30** - 全ユーザーロール動作確認
- **11:30-12:00** - デバッグコード削除
- **12:00-12:30** - 昼休み
- **12:30-13:00** - エラーハンドリング確認
- **13:00-13:30** - 環境変数確認
- **13:30-14:00** - パスワードリセット機能テスト
- **14:00-14:30** - セキュリティチェック

### Day 2（明日）- 最終確認とリリース
- **10:00-10:30** - パフォーマンス確認
- **10:30-11:00** - DynamoDBデータ整合性確認
- **11:00-11:30** - デプロイメント確認
- **11:30-12:00** - 最終動作確認（スモークテスト）
- **12:00-13:00** - 昼休み
- **13:00-14:00** - 問題修正（もしあれば）
- **14:00-14:30** - リリース判定会議
- **14:30-15:00** - Go判定の場合、本番公開

---

## ✅ リリース判定基準

### Go判定（リリース可能）
1. ✅ 動画アップロード機能が正常動作
2. ✅ 全ユーザーロールで正常ログイン
3. ✅ 主要機能が正常動作
4. ✅ 重大なセキュリティ問題なし
5. ✅ デバッグコード削除完了
6. ✅ エラーハンドリング適切

### No-Go判定（リリース延期）
1. ❌ 動画アップロードが動作しない
2. ❌ 認証エラーでログインできない
3. ❌ データ破損や不整合が発生
4. ❌ 重大なセキュリティ脆弱性発見
5. ❌ パフォーマンスが著しく悪い
6. ❌ ユーザー体験を著しく損なうバグ

---

## 📞 緊急連絡先

### エスカレーション
- **Level 1（軽微）**: 4時間以内に対応
- **Level 2（中度）**: 2時間以内に対応
- **Level 3（重大）**: 即座に対応

### ロールバック手順
1. Amplifyフロントエンド: 前回のデプロイに戻す
2. Lambda関数: 前回のバージョンに戻す
3. DynamoDBデータ: ポイントインタイムリカバリ
4. S3データ: バージョニングで以前のバージョンに戻す

---

## 📚 参考リンク

### AWS Console
- [Amplify Console](https://console.aws.amazon.com/amplify/home?region=ap-northeast-1)
- [API Gateway](https://console.aws.amazon.com/apigateway/home?region=ap-northeast-1)
- [Lambda](https://console.aws.amazon.com/lambda/home?region=ap-northeast-1)
- [DynamoDB](https://console.aws.amazon.com/dynamodb/home?region=ap-northeast-1)
- [S3](https://console.aws.amazon.com/s3/home?region=ap-northeast-1)
- [CloudWatch](https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1)
- [Cognito](https://console.aws.amazon.com/cognito/home?region=ap-northeast-1)

### ドキュメント
- [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md)
- [RELEASE_READINESS_CHECK.md](./RELEASE_READINESS_CHECK.md)
- [S3_UPLOAD_FIX_REPORT.md](../video-nfc-infrastructure/S3_UPLOAD_FIX_REPORT.md)
- [VIDEO_DELETE_FIX.md](./VIDEO_DELETE_FIX.md)

---

## 📝 進捗記録

### 作業記録
```
日時: ___________
担当者: ___________

完了項目:
- [ ]

問題点:
- 

リリース判定: [ ] Go [ ] No-Go
理由: 
```

---

**最終更新**: 2025-01-02
**次回更新予定**: リリース判定会議後
