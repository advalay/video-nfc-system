# テストアカウント一覧

## 環境: dev

### システム管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | システム管理会社 |
| **メールアドレス** | system-admin@example.com |
| **パスワード** | AdminPass123! |
| **Cognitoグループ** | system-admin |
| **organizationId** | SYSTEM |
| **shopId** | - |
| **閲覧範囲** | 全てのパートナー企業・販売店の動画 |
| **権限** | 全動画の閲覧・削除、全組織の管理 |

---

## パートナー企業A（親組織）

### パートナー企業A - 組織管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業A - 組織管理者 |
| **メールアドレス** | orga-admin@example.com |
| **パスワード** | OrgAPass123! |
| **Cognitoグループ** | organization-admin |
| **organizationId** | ORG_A |
| **shopId** | - |
| **閲覧範囲** | ORG_A配下の全販売店の動画（SHOP_A1, SHOP_A2, SHOP_A3） |
| **権限** | 自組織配下の動画閲覧・アップロード、販売店管理 |

### 販売店A - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業A - 販売店A |
| **メールアドレス** | shop-a1@example.com |
| **パスワード** | ShopA1Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_A |
| **shopId** | SHOP_A1 |
| **閲覧範囲** | SHOP_A1の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

### 販売店B - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業A - 販売店B |
| **メールアドレス** | shop-a2@example.com |
| **パスワード** | ShopA2Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_A |
| **shopId** | SHOP_A2 |
| **閲覧範囲** | SHOP_A2の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

### 販売店C - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業A - 販売店C |
| **メールアドレス** | shop-a3@example.com |
| **パスワード** | ShopA3Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_A |
| **shopId** | SHOP_A3 |
| **閲覧範囲** | SHOP_A3の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

---

## パートナー企業B（親組織）

### パートナー企業B - 組織管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業B - 組織管理者 |
| **メールアドレス** | orgb-admin@example.com |
| **パスワード** | OrgBPass123! |
| **Cognitoグループ** | organization-admin |
| **organizationId** | ORG_B |
| **shopId** | - |
| **閲覧範囲** | ORG_B配下の全販売店の動画（SHOP_B1, SHOP_B2, SHOP_B3） |
| **権限** | 自組織配下の動画閲覧・アップロード、販売店管理 |

### 販売店A - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業B - 販売店A |
| **メールアドレス** | shop-b1@example.com |
| **パスワード** | ShopB1Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_B |
| **shopId** | SHOP_B1 |
| **閲覧範囲** | SHOP_B1の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

### 販売店B - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業B - 販売店B |
| **メールアドレス** | shop-b2@example.com |
| **パスワード** | ShopB2Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_B |
| **shopId** | SHOP_B2 |
| **閲覧範囲** | SHOP_B2の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

### 販売店C - 販売店ユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業B - 販売店C |
| **メールアドレス** | shop-b3@example.com |
| **パスワード** | ShopB3Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_B |
| **shopId** | SHOP_B3 |
| **閲覧範囲** | SHOP_B3の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

---

## パートナー企業C（販売店なし）

### パートナー企業C - 組織管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | パートナー企業C - 組織管理者 |
| **メールアドレス** | orgc-admin@example.com |
| **パスワード** | OrgCPass123! |
| **Cognitoグループ** | organization-admin |
| **organizationId** | ORG_C |
| **shopId** | - |
| **閲覧範囲** | 販売店なし（直接動画管理） |
| **権限** | 自組織の動画閲覧・アップロード |

---

## 組織構造図

```
システム管理者
├── パートナー企業A (ORG_A)
│   ├── 販売店A (SHOP_A1)
│   ├── 販売店B (SHOP_A2)
│   └── 販売店C (SHOP_A3)
├── パートナー企業B (ORG_B)
│   ├── 販売店A (SHOP_B1)
│   ├── 販売店B (SHOP_B2)
│   └── 販売店C (SHOP_B3)
└── パートナー企業C (ORG_C)
    └── 販売店なし
```

---

## ログイン情報まとめ

### システム管理者
- **system-admin@example.com** / AdminPass123!

### パートナー企業A
- **orga-admin@example.com** / OrgAPass123! (組織管理者)
- **shop-a1@example.com** / ShopA1Pass123! (販売店A)
- **shop-a2@example.com** / ShopA2Pass123! (販売店B)
- **shop-a3@example.com** / ShopA3Pass123! (販売店C)

### パートナー企業B
- **orgb-admin@example.com** / OrgBPass123! (組織管理者)
- **shop-b1@example.com** / ShopB1Pass123! (販売店A)
- **shop-b2@example.com** / ShopB2Pass123! (販売店B)
- **shop-b3@example.com** / ShopB3Pass123! (販売店C)

### パートナー企業C
- **orgc-admin@example.com** / OrgCPass123! (組織管理者)

---

## テストシナリオ

### 1. 権限テスト
- システム管理者で全組織の動画・組織管理ができること
- パートナー企業管理者で自組織配下の動画・販売店管理ができること
- 販売店ユーザーで自販売店の動画のみアクセスできること

### 2. 組織管理テスト
- パートナー企業A/Bで販売店の追加・削除・編集ができること
- パートナー企業Cで販売店なしでも動作すること

### 3. 動画管理テスト
- 各レベルで適切な動画の表示・アップロードができること
- 権限外の動画にアクセスできないこと

### 4. 承認ワークフロー テスト
- システム管理者が新規パートナー企業・販売店の承認ができること
- 申請者がフォーム入力から承認まで完了できること