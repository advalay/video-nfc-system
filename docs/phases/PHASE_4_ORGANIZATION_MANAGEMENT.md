# フェーズ4: 組織・販売店管理機能の完成

**作成日**: 2025年10月18日  
**目的**: システム管理者が組織・販売店を追加し、パートナー企業・販売店が自分の情報を編集できる機能を実装

---

## 📊 既存DBの組織データ構造

DynamoDBの`video-nfc-Organization-dev`テーブルには以下のフィールドがあります：

```typescript
interface Organization {
  organizationId: string;           // 自動生成
  organizationName: string;         // 組織名
  organizationType: 'agency' | 'store'; // パートナー企業 or 販売店
  contactPerson: string;            // 担当者名
  contactEmail: string;             // 連絡先メール
  contactphone: string;             // 連絡先電話（注: phoneではなくcontactphone）
  billingAddress: string;           // 請求先住所
  status: 'active' | 'inactive';    // ステータス
  shops: Array<{                    // 配下の販売店（後から追加）
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  createdAt: string;                // 作成日時（自動）
  updatedAt: string;                // 更新日時（自動）
}
```

---

## 🎯 権限設計（重要）

### 役割と権限

| 役割 | 組織作成 | 組織編集 | 販売店作成 | 販売店編集 | アカウント情報編集 |
|---|---|---|---|---|---|
| **システム管理者** | ✅ | ✅ 全フィールド | ✅ | ✅ 全フィールド | ❌ |
| **パートナー企業** | ❌ | ✅ 限定 | ❌ | ❌ | ✅ 自社のみ |
| **販売店** | ❌ | ❌ | ❌ | ✅ 限定 | ✅ 自店舗のみ |

### 編集可能なフィールド

#### システム管理者（すべて編集可能）
- organizationName（組織名）
- organizationType（パートナー企業 or 販売店）
- contactPerson（担当者名）
- contactEmail（連絡先メール）
- contactphone（電話番号）
- billingAddress（請求先住所）
- status（ステータス）
- shops（販売店の追加・削除）

#### パートナー企業・販売店（限定的に編集可能）
- contactPerson（担当者名）⭐
- contactphone（担当電話番号）⭐
- contactEmail（連絡先メール）⭐

### 運用フロー

1. **システム管理者が組織を作成**
   - 組織情報をすべて入力
   - 販売店は**後から追加**（初期は空でOK）
   - Cognitoユーザー自動作成（organization-admin）

2. **システム管理者が販売店を追加**
   - 組織管理画面から販売店を追加
   - Cognitoユーザー自動作成（shop-user）

3. **パートナー企業・販売店が自分の情報を編集**
   - プロフィール編集ページで限定的に編集
   - 担当者名、電話番号、連絡先メールのみ

---

## 📋 実装チェックリスト

### フェーズ4A: 組織追加機能（所要時間: 2-3時間）

#### ✅ ステップ1: 組織作成ページの作成
- [ ] `app/admin/organizations/new/page.tsx` を作成
- [ ] 以下のフィールドをすべて含むフォームを実装:
  - [ ] organizationName（組織名）- 必須
  - [ ] organizationType（パートナー企業 or 販売店）- 必須
  - [ ] email（管理者メールアドレス）- 必須
  - [ ] contactPerson（担当者名）- 必須
  - [ ] contactphone（電話番号）- 任意
  - [ ] contactEmail（連絡先メール）- 任意
  - [ ] billingAddress（請求先住所）- 任意
- [ ] フォームバリデーション実装
- [ ] ローディング状態の表示

#### ✅ ステップ2: API統合
- [ ] `lib/api-client.ts` に `createOrganization` 関数追加
- [ ] `POST /organizations` でバックエンドにデータ送信
- [ ] レスポンスに `tempPassword` が含まれることを確認
- [ ] エラーハンドリング実装

#### ✅ ステップ3: ログイン情報表示モーダル
- [ ] `components/OrganizationCreatedModal.tsx` を作成
- [ ] 以下の情報を表示:
  - 組織名
  - ログインURL
  - メールアドレス
  - 初期パスワード
- [ ] クリップボードコピー機能実装
- [ ] 警告メッセージ「この情報は再表示できません」

#### ✅ ステップ4: 組織一覧ページに追加ボタン
- [ ] `app/admin/organizations/page.tsx` に「新規組織追加」ボタン追加
- [ ] ボタンクリックで `/admin/organizations/new` に遷移

---

### フェーズ4B: 販売店追加機能（所要時間: 2-3時間）

#### ✅ ステップ5: createShop権限の修正（バックエンド）
- [ ] `lambda/src/handlers/createShop.ts` を修正
- [ ] `system-admin` も販売店作成可能にする
- [ ] organization-adminの場合のみ organizationId チェック
- [ ] Lambda関数をビルド
- [ ] CDKデプロイ

#### ✅ ステップ6: 販売店作成モーダル
- [ ] `components/CreateShopModal.tsx` を作成
- [ ] 以下のフィールドを含むフォーム:
  - [ ] shopName（販売店名）- 必須
  - [ ] email（管理者メールアドレス）- 必須
  - [ ] contactPhone（電話番号）- 任意
  - [ ] contactEmail（連絡先メール）- 任意
- [ ] `POST /shops` でAPI呼び出し
- [ ] 成功時にログイン情報を表示

#### ✅ ステップ7: 組織一覧ページに販売店追加ボタン
- [ ] `app/admin/organizations/page.tsx` の組織カードに「販売店追加」ボタン追加
- [ ] ボタンクリックで販売店作成モーダル表示
- [ ] 選択した組織のIDを自動セット

---

### フェーズ4C: プロフィール編集機能（所要時間: 1-2時間）

#### ✅ ステップ8: プロフィール編集API（バックエンド）
- [ ] `lambda/src/handlers/updateProfile.ts` を作成
- [ ] organization-admin と shop-user のみアクセス可能
- [ ] 編集可能フィールド: contactPerson, contactphone, contactEmail
- [ ] 自分の組織/販売店のみ編集可能
- [ ] CDKでAPI Gateway設定
- [ ] デプロイ

#### ✅ ステップ9: プロフィール編集ページ（フロントエンド）
- [ ] `app/profile/page.tsx` または `app/settings/page.tsx` を作成
- [ ] 現在の情報を表示
- [ ] 編集可能フィールドのみフォーム表示:
  - contactPerson（担当者名）
  - contactphone（電話番号）
  - contactEmail（連絡先メール）
- [ ] `PUT /profile` でAPI呼び出し
- [ ] 成功時にトースト通知

#### ✅ ステップ10: ナビゲーションに追加
- [ ] `components/Layout.tsx` に「プロフィール設定」リンク追加
- [ ] organization-admin と shop-user に表示

---

### フェーズ4D: テストと動作確認（所要時間: 1時間）

#### ✅ ステップ11: 組織作成のテスト
- [ ] システム管理者でログイン
- [ ] 「新規組織追加」ボタンをクリック
- [ ] すべてのフィールドを入力して送信
- [ ] ログイン情報が表示されることを確認
- [ ] ログイン情報をコピー

#### ✅ ステップ12: Cognito確認
- [ ] AWSコンソールでCognitoを開く
- [ ] 新しいユーザーが作成されているか確認
- [ ] `custom:organizationId` が設定されているか確認
- [ ] `organization-admin` グループに所属しているか確認

#### ✅ ステップ13: 組織ユーザーでログイン
- [ ] 発行されたメール・パスワードでログイン
- [ ] 販売店統計ページにアクセスできるか確認
- [ ] 自組織のデータのみ表示されるか確認
- [ ] プロフィール編集ページにアクセスできるか確認

#### ✅ ステップ14: 販売店作成のテスト
- [ ] システム管理者で組織管理画面を開く
- [ ] 「販売店追加」ボタンをクリック
- [ ] 販売店情報を入力して送信
- [ ] ログイン情報が表示されることを確認
- [ ] DynamoDBに登録されているか確認
- [ ] Cognitoユーザーが作成されているか確認

#### ✅ ステップ15: 販売店ユーザーでログイン
- [ ] 発行されたメール・パスワードでログイン
- [ ] 動画アップロードページにアクセスできるか確認
- [ ] プロフィール編集で自店舗情報を編集できるか確認
- [ ] 他の店舗情報は編集できないことを確認

---

### フェーズ4E: 最終確認（所要時間: 30分）

#### ✅ ステップ16: 権限チェック
- [ ] システム管理者: 組織・販売店の作成・編集・削除が可能
- [ ] パートナー企業: プロフィール編集のみ可能
- [ ] 販売店: プロフィール編集のみ可能

#### ✅ ステップ17: エラーハンドリング確認
- [ ] メールアドレス重複時のエラー処理
- [ ] 必須フィールド未入力時のエラー表示
- [ ] ネットワークエラー時のエラー表示

#### ✅ ステップ18: Git commit & push
- [ ] すべてのファイルをコミット
- [ ] Git push してAmplifyデプロイ
- [ ] デプロイ完了を確認

---

## 📝 必要なファイル

### 新規作成
- `app/admin/organizations/new/page.tsx` - 組織追加ページ
- `components/OrganizationCreatedModal.tsx` - ログイン情報表示
- `components/CreateShopModal.tsx` - 販売店作成モーダル
- `app/profile/page.tsx` - プロフィール編集ページ
- `lambda/src/handlers/updateProfile.ts` - プロフィール更新API

### 更新
- `app/admin/organizations/page.tsx` - ボタン追加
- `components/Layout.tsx` - ナビゲーション追加
- `lib/api-client.ts` - API関数追加
- `lambda/src/handlers/createShop.ts` - 権限修正
- `lib/api-stack.ts` - API Gateway設定

---

## 🎯 期待される結果

### 組織作成フロー
1. システム管理者が「新規組織追加」ボタンをクリック
2. 組織情報をすべて入力
3. 送信すると、バックエンドで:
   - DynamoDBに組織登録
   - Cognitoユーザー作成
   - organization-adminグループに追加
4. ログイン情報が表示される
5. システム管理者が組織管理者に情報を送信

### 販売店作成フロー
1. システム管理者が組織管理画面を開く
2. 「販売店追加」ボタンをクリック
3. 販売店情報を入力
4. Cognitoユーザー自動作成
5. ログイン情報を発行

### プロフィール編集フロー
1. パートナー企業・販売店がログイン
2. プロフィール設定ページを開く
3. 担当者名、電話番号、連絡先メールを編集
4. 保存して更新完了

---

## ⚠️ 注意事項

1. **セキュリティ**
   - 一時パスワードは画面上に一度だけ表示
   - 再表示不可（セキュリティ上の理由）

2. **権限分離**
   - システム管理者: すべての組織・販売店を管理
   - パートナー企業・販売店: 自分の情報のみ編集

3. **データ整合性**
   - 組織作成時は販売店は空でOK
   - 後からシステム管理者が販売店を追加

4. **UX**
   - ローディング状態の表示
   - 成功メッセージのトースト通知
   - フォームバリデーション

---

## 🚀 次のフェーズ（フェーズ5）への準備

フェーズ4完了後:
- ✅ 組織・販売店の追加が可能
- ✅ ユーザーが自動作成される
- ✅ 権限が正しく設定される
- ✅ プロフィール編集が可能

次のフェーズでは:
- 動画削除機能
- コードクリーンアップ
- 本番リリース準備

