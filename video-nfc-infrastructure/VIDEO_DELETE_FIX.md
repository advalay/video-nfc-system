# 動画削除機能の修正報告書

**作成日:** 2025年10月26日  
**対象:** 動画削除機能  
**状態:** ✅ 修正完了

---

## 問題の症状

### ユーザーが報告した問題
- 動画の削除ができない
- 組織管理者（organization-admin）が動画を削除できない

### エラー詳細
- フロントエンドで削除ボタンをクリックしてもエラーが発生
- APIが403 Forbiddenエラーを返す可能性

---

## 根本原因

### 修正前の実装
**ファイル:** `services/delete-video/index.ts`

```typescript
// ショップ所属が必須（グループではなく属性で判定）
const userShopId = (claims?.['custom:shopId'] as string) || '';
if (!userShopId) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Shop affiliation required',
      },
    }),
  };
}

// 販売店ユーザーの場合、自分の組織の動画のみ削除可能
if (videoShopId && videoShopId !== userShopId) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only delete videos from your own shop',
      },
    }),
  };
}
```

### 問題点
1. **`shopId`が必須**: すべてのユーザーに対して`custom:shopId`属性が必要だった
2. **組織管理者が除外**: `organization-admin`ユーザーには`shopId`がないため、削除できない
3. **権限チェック不足**: `organization-admin`グループがチェックされていない

---

## 修正内容

### 新しい権限チェックロジック

```typescript
// 組織管理者と販売店管理者のいずれかのみ削除可能
const isOrganizationAdmin = userGroups.includes('organization-admin');
const isShopAdmin = userGroups.includes('shop-admin');

if (!isOrganizationAdmin && !isShopAdmin) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only organization administrators and shop administrators can delete videos',
      },
    }),
  };
}

// 組織管理者の場合: 自分の組織の動画のみ削除可能
if (isOrganizationAdmin) {
  const userOrganizationId = claims?.['custom:organizationId'] as string;
  
  if (videoOrganizationId !== userOrganizationId) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete videos from your own organization',
        },
      }),
    };
  }
}

// 販売店管理者の場合: 自分の店舗の動画のみ削除可能
if (isShopAdmin) {
  const userShopId = (claims?.['custom:shopId'] as string) || '';
  
  if (!userShopId) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Shop ID not found in user claims',
        },
      }),
    };
  }
  
  if (videoShopId && videoShopId !== userShopId) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete videos from your own shop',
        },
      }),
    };
  }
}
```

### 変更点のまとめ
1. **両方のグループを許可**: `organization-admin`と`shop-admin`の両方が削除可能
2. **条件分岐**: ユーザーのグループに応じて異なる権限チェックを実行
3. **組織管理者**: 自分の組織のすべての動画を削除可能
4. **店舗管理者**: 自分の店舗の動画のみ削除可能

---

## 権限設定の詳細

### Organization Admin
- **条件**: `custom:organizationId`が動画の`organizationId`と一致
- **削除可能範囲**: 自分の組織に属するすべての動画（すべての店舗）
- **例**: パートナー企業Aの組織管理者は、パートナー企業Aのすべての店舗の動画を削除可能

### Shop Admin
- **条件**: `custom:shopId`が動画の`shopId`と一致
- **削除可能範囲**: 自分の店舗の動画のみ
- **例**: 木村販売店の販売店管理者は、木村販売店の動画のみ削除可能

---

## セキュリティ考慮事項

### 1. 48時間削除制限
- 動画アップロードから48時間経過後は削除不可
- この制限は組織管理者にも適用

### 2. Object Lock
- 本番環境のS3バケットでObject Lock（COMPLIANCEモード）が有効
- 削除できない場合でも、メタデータは削除される

### 3. 監査ログ
- すべての削除試行がCloudWatchに記録
- ユーザー情報、動画情報、結果が含まれる

---

## デプロイ履歴

1. **2025-10-26 03:32 UTC**: Lambda関数を本番環境にデプロイ
2. **2025-10-26 03:32 UTC**: Lambda関数を開発環境にデプロイ
3. **2025-10-26 03:32 UTC**: Git commit: `e38a98b` "Fix: Allow organization-admin and shop-admin to delete videos"

---

## テスト手順

### 1. 組織管理者の削除テスト
1. パートナー企業Aの組織管理者でログイン
2. 動画一覧を表示
3. 自分の組織の動画の削除ボタンをクリック
4. 確認ダイアログでOKをクリック
5. 削除成功を確認

### 2. 店舗管理者の削除テスト
1. 木村販売店の販売店管理者でログイン
2. 動画一覧を表示
3. 自分の店舗の動画の削除ボタンをクリック
4. 確認ダイアログでOKをクリック
5. 削除成功を確認

### 3. 権限チェックのテスト
1. 組織管理者が他組織の動画を削除しようとすると403エラー
2. 店舗管理者が他店舗の動画を削除しようとすると403エラー
3. 48時間経過後の動画は削除不可

---

## 関連ファイル

### 修正したファイル
- `video-nfc-infrastructure/services/delete-video/index.ts`

### 関連するファイル
- `video-nfc-admin/app/videos/page.tsx` (フロントエンドの削除UI)
- `video-nfc-admin/lib/api-client.ts` (APIクライアント)

---

## 今後の改善提案

1. **削除前の確認ダイアログ改善**
   - より詳細な情報（動画タイトル、ファイルサイズ、アップロード日時など）を表示
   - 「この動画を削除しますか？」の確認メッセージを改善

2. **削除進捗の表示**
   - 削除処理中のローディング表示
   - 削除完了後にリストを自動更新

3. **一括削除機能**
   - 複数の動画を選択して一括削除
   - 組織管理者向けの機能

4. **削除ログの可視化**
   - 管理画面で削除履歴を確認
   - 誰が、いつ、どの動画を削除したかを表示

---

**作成者:** AI Assistant  
**最終更新:** 2025年10月26日
