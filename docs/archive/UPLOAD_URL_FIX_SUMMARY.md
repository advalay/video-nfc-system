# アップロード完了後のURL表示修正レポート

## 問題の症状

アップロード完了後に表示される「公開URL」が間違っていた。
- **動画一覧のリンク**: 正しく動作（`/watch?id=videoId`）
- **アップロード完了後のURL**: 正しくないURLが表示されていた

## 根本原因

### 修正前（`useUpload.ts`）
```typescript
const uploadResult: UploadResult = {
  videoId,
  videoUrl: `https://example.com/videos/${videoId}`, // ❌ ダミーURL
  thumbnailUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(title)}`,
  title,
  size: file.size,
  duration: 0,
};
```

### 修正後（`useUpload.ts` - 現在）
```typescript
const uploadResult: UploadResult = {
  videoId,
  videoUrl: `${window.location.origin}/watch?id=${videoId}`, // ✅ 正しい視聴URL
  thumbnailUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(title)}`,
  title,
  size: file.size,
  duration: 0,
};
```

## 影響範囲

### 修正される機能
1. **アップロード完了画面の「公開URL」表示**
   - 正しい視聴URLが表示される
   - コピーボタンで正しいURLをコピーできる

2. **QRコード生成**
   - QRコードが正しい視聴URLを指す
   - QRコードをスキャンして動画が視聴できる

3. **「動画を開く」ボタン**
   - 新しいタブで正しい視聴ページが開く

### 変更ファイル
- `video-nfc-admin/hooks/useUpload.ts` (132行目)

## 修正コミット

**コミット**: `b1933c9` - "feat: Fix upload URL and improve video list display"

### 変更内容
1. `useUpload.ts`の`videoUrl`を`window.location.origin/watch?id=videoId`に変更
2. 動画一覧の表示改善（タイトル + ファイル名）
3. 動画IDモーダルの追加

## デプロイ状況

### Amplifyビルド
- **最新ビルド**: Job #200 (進行中)
- **前回ビルド**: Job #199 (成功)
  - コミット: `354b250`
  - 状態: SUCCEED
  - 完了時刻: 2025-10-26 15:21:53

### 確認方法

#### 1. ブラウザでの確認
```
1. https://main.d3vnoskfyyh2d2.amplifyapp.com にアクセス
2. 販売店アカウントでログイン
3. 動画をアップロード
4. 完了画面の「公開URL」が以下の形式か確認:
   https://main.d3vnoskfyyh2d2.amplifyapp.com/watch?id=[videoId]
```

#### 2. QRコードの確認
```
1. 「QRコード表示」ボタンをクリック
2. QRコードをスキャン
3. 正しい視聴ページが開くことを確認
```

#### 3. 「動画を開く」ボタンの確認
```
1. 「動画を開く」ボタンをクリック
2. 新しいタブで正しい視聴ページが開くことを確認
```

## 注意事項

### キャッシュクリア
Amplifyビルドが完了した後、ブラウザのキャッシュをクリアすることを推奨:
- Chrome: `Cmd+Shift+R` (Mac) または `Ctrl+Shift+R` (Windows)
- Safari: `Cmd+Option+E`
- Firefox: `Cmd+Shift+Delete` → キャッシュをクリア

### 404エラーの解消
`/_next/static/chunks/...js` の404エラーは、Amplifyのビルドキャッシュ問題が原因の可能性があります。
Job #200のビルド完了後、自動的に解消されるはずです。

## 今後の改善案

1. **動画URLの事前検証**
   - アップロード完了後に実際に動画が視聴できるか確認
   - エラー時は警告を表示

2. **短縮URLの提供**
   - より短いURLを生成して共有しやすくする

3. **URLのカスタマイズ**
   - 組織ごとや動画カテゴリーごとにURLパターンを変更できるようにする

## トラブルシューティング

### URLが正しくない場合
1. Amplifyビルドが完了しているか確認
2. ブラウザのキャッシュをクリア
3. ハードリロードを実行
4. もう一度アップロードを試行

### QRコードが動作しない場合
1. QRコードをスキャンして、生成されるURLを確認
2. URLが正しい形式か確認（`https://.../watch?id=...`）
3. 動画IDが正しいか確認

## 参考資料

- [RELEASE_PLAN.md](./RELEASE_PLAN.md)
- [S3_UPLOAD_FIX_REPORT.md](../video-nfc-infrastructure/S3_UPLOAD_FIX_REPORT.md)

---

**作成日**: 2025-01-02  
**最終更新**: 2025-01-02  
**担当者**: Video NFC Development Team
