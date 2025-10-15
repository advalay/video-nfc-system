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
| **閲覧範囲** | 全ての代理店・販売店の動画 |
| **権限** | 全動画の閲覧・削除、全組織の管理 |

---

### 代理店A - 組織管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | 葬儀社グループA - 組織管理者 |
| **メールアドレス** | orga-admin@example.com |
| **パスワード** | OrgAPass123! |
| **Cognitoグループ** | organization-admin |
| **organizationId** | ORG_A |
| **shopId** | - |
| **閲覧範囲** | ORG_A配下の全販売店の動画（SHOP_A1, SHOP_A2） |
| **権限** | 自組織配下の動画閲覧・アップロード、販売店管理 |

---

### 代理店B - 組織管理者アカウント

| 項目 | 値 |
|------|-----|
| **役割** | 葬儀社グループB - 組織管理者 |
| **メールアドレス** | orgb-admin@example.com |
| **パスワード** | OrgBPass123! |
| **Cognitoグループ** | organization-admin |
| **organizationId** | ORG_B |
| **shopId** | - |
| **閲覧範囲** | ORG_B配下の全販売店の動画 |
| **権限** | 自組織配下の動画閲覧・アップロード、販売店管理 |

---

### 販売店A1 - ショップユーザーアカウント

| 項目 | 値 |
|------|-----|
| **役割** | 東京支店 - ショップユーザー |
| **メールアドレス** | shop-a1@example.com |
| **パスワード** | ShopA1Pass123! |
| **Cognitoグループ** | shop-user |
| **organizationId** | ORG_A |
| **shopId** | SHOP_A1 |
| **閲覧範囲** | SHOP_A1の動画のみ |
| **権限** | 自販売店の動画閲覧・アップロード |

---

## クイックログイン

```bash
# システム管理者
メール: system-admin@example.com
パスワード: AdminPass123!

# 代理店A管理者
メール: orga-admin@example.com
パスワード: OrgAPass123!

# 代理店B管理者
メール: orgb-admin@example.com
パスワード: OrgBPass123!

# 販売店A1
メール: shop-a1@example.com
パスワード: ShopA1Pass123!
```

---

最終更新日: 2025-10-08






