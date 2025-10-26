# S3動画アップロード問題の修正報告書

**作成日:** 2025年10月26日  
**対象:** 動画アップロード機能  
**状態:** ✅ 修正完了

---

## 問題の症状

### ユーザーが報告した問題
1. 動画アップロードを実行すると「S3アップロード失敗: 400 Bad Request」エラーが発生
2. DynamoDBには動画メタデータが保存される（`status: 'completed'`）
3. 動画一覧には表示されるが、再生時に `NotSupportedError: The element has no supported sources` エラー
4. **S3には実際に動画ファイルが保存されていない**

### エラーログ
```
✔ 署名付きURL取得成功
Step 2: S3へアップロード中...
❌ S3 アップロード失敗: 400 Bad Request
```

---

## 根本原因の特定プロセス

### 1. 最初の仮説: AWS SDK v3のチェックサムパラメータ問題

**現象:**
- AWS SDK v3が署名付きURLに自動的に `x-amz-checksum-crc32` と `x-amz-sdk-checksum-algorithm=CRC32` を追加
- ブラウザの`fetch` APIはCRC32チェックサムを自動計算できない
- S3が署名検証に失敗して400エラーを返す

**試行1: SDK v3の`signableHeaders`オプション追加**
```typescript
const uploadUrl = await getSignedUrl(s3, command, { 
  expiresIn: 3600,
  signableHeaders: new Set(['host']),
});
```
❌ **結果:** 失敗（`signableHeaders`が無効）

**試行2: AWS SDK v2へのダウングレード**
```typescript
const s3 = new AWS.S3();
const uploadUrl = s3.getSignedUrl('putObject', {
  Bucket: bucketName,
  Key: s3Key,
  ContentType: contentType,
  Expires: 3600,
});
```
❌ **結果:** 失敗（まだチェックサムパラメータが含まれる）

### 2. 真の根本原因: Object LockとPre-signed POSTの問題

**発見:**
- S3バケット設定を確認: `objectLockEnabled: environment === 'prod'`
- Object Lock有効バケットでは**署名付きURL（PUT方式）でのアップロードが制限される**
- Pre-signed POST方式を使用する必要がある

**試行3: Pre-signed POST URL（間違ったパラメータ形式）**
```typescript
const params = {
  Bucket: bucketName,
  Key: s3Key,              // ❌ 間違い
  ContentType: contentType, // ❌ 間違い
  Expires: 3600,
  Conditions: [...]
};
const uploadUrl = s3.createPresignedPost(params);
```
❌ **結果:** 失敗（`fields`に`key`が含まれない）

**試行4: 手動で`fields`に`key`を追加**
```typescript
const fieldsWithKey = {
  ...uploadUrl.fields,
  key: s3Key,
};
```
❌ **結果:** 部分的に近づいたが、パラメータ構造が間違っていた

### 3. 最終的な解決策: 正しいPre-signed POSTパラメータ形式

**Claude AIの指摘により判明:**
AWS SDK v2の`createPresignedPost()`は`Fields`オブジェクトを必要とする

**正しい形式:**
```typescript
const params = {
  Bucket: bucketName,
  Fields: {                    // ✅ Fieldsオブジェクトが必要
    key: s3Key,
    'Content-Type': contentType,
  },
  Expires: 3600,
  Conditions: [
    ['content-length-range', 0, 10 * 1024 * 1024 * 1024],
  ],
};
const uploadUrl = s3.createPresignedPost(params);
```

---

## 修正内容

### 1. Lambda関数の修正

**ファイル:** `services/generate-upload-url/index.ts`

**変更前:**
```typescript
const params = {
  Bucket: bucketName,
  Key: s3Key,
  ContentType: contentType,
  Expires: 3600,
  Conditions: [
    ['content-length-range', 0, 10 * 1024 * 1024 * 1024],
  ],
};
const uploadUrl = s3.createPresignedPost(params);
```

**変更後:**
```typescript
const params = {
  Bucket: bucketName,
  Fields: {
    key: s3Key,
    'Content-Type': contentType,
  },
  Expires: 3600,
  Conditions: [
    ['content-length-range', 0, 10 * 1024 * 1024 * 1024],
  ],
};
const uploadUrl = s3.createPresignedPost(params);
```

### 2. フロントエンドの修正

**ファイル:** `video-nfc-admin/hooks/useUpload.ts`

**変更内容:**
- `XMLHttpRequest`から`fetch` APIに変更
- PUT方式からPOST方式に変更
- FormDataを使用してフィールドとファイルを送信

```typescript
const formData = new FormData();

// すべてのfieldsをフォームデータに追加
Object.keys(fields).forEach(key => {
  formData.append(key, fields[key]);
});

// ファイルを最後に追加
formData.append('file', file);

// Pre-signed POSTでアップロード
const response = await fetch(uploadUrl, {
  method: 'POST',
  body: formData,
});
```

---

## 修正後の動作

### 正しいfieldsの生成
```json
{
  "key": "videos/ORG_A/SHOP_ORG_A_001/.../test.mp4",
  "Content-Type": "video/mp4",
  "bucket": "video-nfc-videos-prod-...",
  "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
  "X-Amz-Credential": "...",
  "X-Amz-Date": "...",
  "X-Amz-Security-Token": "...",
  "Policy": "...",
  "X-Amz-Signature": "..."
}
```

### アップロードフロー
1. ✅ Lambda関数がPre-signed POST URLと`fields`を生成
2. ✅ フロントエンドがFormDataで`fields`とファイルを送信
3. ✅ S3がファイルを受信して保存
4. ✅ DynamoDBにメタデータが保存済み（既に実装済み）
5. ✅ 動画一覧でファイルが再生可能

---

## 学んだこと（教訓）

### 1. Object Lock有効バケットではPre-signed POSTが必須
- **署名付きURL（PUT方式）は使用不可**
- Pre-signed POST方式を使用する必要がある
- これは本番環境のセキュリティ要件による制約

### 2. AWS SDK v2の正しいパラメータ形式
- `createPresignedPost()`は`Fields`オブジェクトを必要とする
- `{ Key, ContentType }`は古い形式で、Pre-signed POSTでは使用不可
- 正しい形式: `{ Fields: { key, 'Content-Type' } }`

### 3. エラーメッセージから根本原因を特定する重要性
- 「400 Bad Request」だけでは不十分
- S3の詳細なエラーレスポンスを確認する必要がある
- Object Lockの制約を理解することで解決に至った

### 4. 段階的なデバッグアプローチ
1. まずLambda関数のレスポンスを直接確認
2. 次にフロントエンドから実際のリクエストを確認
3. S3バケットの設定を再確認
4. 最後に正しいAPI形式を実装

---

## 関連ファイル

### 修正したファイル
- `video-nfc-infrastructure/services/generate-upload-url/index.ts`
- `video-nfc-infrastructure/services/generate-upload-url/package.json` (AWS SDK v2に変更)
- `video-nfc-admin/hooks/useUpload.ts`

### 参考ファイル
- `video-nfc-infrastructure/lib/storage-stack.ts` (Object Lock設定)

---

## デプロイ履歴

1. **2025-10-26 02:37 UTC**: Lambda関数をPre-signed POST対応版に更新
2. **2025-10-26 02:37 UTC**: Git commit: `2a2aa6d` "Fix S3 upload: Use correct Fields parameter for createPresignedPost"

---

## 今後の改善提案

1. **エラーハンドリングの強化**
   - S3からの詳細なエラーレスポンスをログに記録
   - ユーザーに分かりやすいエラーメッセージを表示

2. **アップロード進捗の可視化**
   - POST方式でも進捗を表示できるようにXHRを検討

3. **Object Lockの設定確認**
   - 開発環境でも動作確認できるように、本番環境の設定をドキュメント化

---

**作成者:** AI Assistant  
**最終更新:** 2025年10月26日

