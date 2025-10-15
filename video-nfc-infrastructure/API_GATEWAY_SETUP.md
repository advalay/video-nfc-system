# API Gateway設定手順 - 承認ワークフロー

## 概要
既存のAPI Gateway (`ujwli7k2ti`) に承認ワークフロー用のエンドポイントを追加します。

## 前提条件
- ✅ Lambda関数6つ作成済み
- ✅ DynamoDBテーブル作成済み
- ✅ API Gateway: `https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev`

---

## 🔧 設定手順

### 1️⃣ AWS Console → API Gateway
1. AWS Management Console → API Gateway
2. 既存のAPI `video-nfc-api-dev` (ID: `ujwli7k2ti`) を選択

---

### 2️⃣ リソース作成: `/approvals`

#### ステップ1: `/approvals` リソース作成
1. 左メニュー「リソース」をクリック
2. 「アクション」→「リソースの作成」
3. 設定:
   - リソース名: `approvals`
   - リソースパス: `/approvals`
   - ✅ CORS を有効にする
4. 「リソースの作成」をクリック

#### ステップ2: GET メソッド追加 (getPendingApprovals)
1. `/approvals` を選択
2. 「アクション」→「メソッドの作成」→「GET」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `getPendingApprovals`
4. 「保存」→「OK」

#### ステップ3: GET メソッドに認証追加
1. `/approvals` の GET メソッドを選択
2. 「メソッドリクエスト」をクリック
3. 「承認」→「編集」
4. 承認: `video-nfc-authorizer` (Cognito)
5. 「保存」

#### ステップ4: POST メソッド追加 (createApprovalRequest)
1. `/approvals` を選択
2. 「アクション」→「メソッドの作成」→「POST」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `createApprovalRequest`
4. 「保存」→「OK」

#### ステップ5: POST メソッドに認証追加
1. `/approvals` の POST メソッドを選択
2. 「メソッドリクエスト」をクリック
3. 「承認」→「編集」
4. 承認: `video-nfc-authorizer` (Cognito)
5. 「保存」

---

### 3️⃣ リソース作成: `/approvals/{requestId}`

#### ステップ1: `{requestId}` リソース作成
1. `/approvals` を選択
2. 「アクション」→「リソースの作成」
3. 設定:
   - リソース名: `{requestId}`
   - リソースパス: `/{requestId}`
   - ✅ CORS を有効にする
4. 「リソースの作成」をクリック

#### ステップ2: GET メソッド追加 (getApprovalRequest)
1. `/approvals/{requestId}` を選択
2. 「アクション」→「メソッドの作成」→「GET」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `getApprovalRequest`
4. 「保存」→「OK」

⚠️ **GET メソッドは認証不要**（公開フォーム用）

---

### 4️⃣ リソース作成: `/approvals/{requestId}/submit`

#### ステップ1: `submit` リソース作成
1. `/approvals/{requestId}` を選択
2. 「アクション」→「リソースの作成」
3. 設定:
   - リソース名: `submit`
   - リソースパス: `/submit`
   - ✅ CORS を有効にする
4. 「リソースの作成」をクリック

#### ステップ2: POST メソッド追加 (submitApprovalForm)
1. `/approvals/{requestId}/submit` を選択
2. 「アクション」→「メソッドの作成」→「POST」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `submitApprovalForm`
4. 「保存」→「OK」

⚠️ **POST メソッドは認証不要**（公開フォーム用）

---

### 5️⃣ リソース作成: `/approvals/{requestId}/approve`

#### ステップ1: `approve` リソース作成
1. `/approvals/{requestId}` を選択
2. 「アクション」→「リソースの作成」
3. 設定:
   - リソース名: `approve`
   - リソースパス: `/approve`
   - ✅ CORS を有効にする
4. 「リソースの作成」をクリック

#### ステップ2: POST メソッド追加 (approveRequest)
1. `/approvals/{requestId}/approve` を選択
2. 「アクション」→「メソッドの作成」→「POST」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `approveRequest`
4. 「保存」→「OK」

#### ステップ3: POST メソッドに認証追加
1. `/approvals/{requestId}/approve` の POST メソッドを選択
2. 「メソッドリクエスト」をクリック
3. 「承認」→「編集」
4. 承認: `video-nfc-authorizer` (Cognito)
5. 「保存」

---

### 6️⃣ リソース作成: `/approvals/{requestId}/reject`

#### ステップ1: `reject` リソース作成
1. `/approvals/{requestId}` を選択
2. 「アクション」→「リソースの作成」
3. 設定:
   - リソース名: `reject`
   - リソースパス: `/reject`
   - ✅ CORS を有効にする
4. 「リソースの作成」をクリック

#### ステップ2: POST メソッド追加 (rejectRequest)
1. `/approvals/{requestId}/reject` を選択
2. 「アクション」→「メソッドの作成」→「POST」
3. 設定:
   - 統合タイプ: Lambda 関数
   - Lambda プロキシ統合の使用: ✅ チェック
   - Lambda リージョン: ap-northeast-1
   - Lambda 関数: `rejectRequest`
4. 「保存」→「OK」

#### ステップ3: POST メソッドに認証追加
1. `/approvals/{requestId}/reject` の POST メソッドを選択
2. 「メソッドリクエスト」をクリック
3. 「承認」→「編集」
4. 承認: `video-nfc-authorizer` (Cognito)
5. 「保存」

---

### 7️⃣ CORS設定（全リソース）

各リソースに対して:
1. リソースを選択
2. 「アクション」→「CORS を有効にする」
3. デフォルト設定のまま「CORS を有効にして既存の CORS ヘッダーを置換」

---

### 8️⃣ デプロイ

#### ステップ1: APIをデプロイ
1. 「アクション」→「API のデプロイ」
2. デプロイされるステージ: `dev`
3. 「デプロイ」をクリック

#### ステップ2: 確認
デプロイ後のURL:
```
https://ujwli7k2ti.execute-api.ap-northeast-1.amazonaws.com/dev
```

---

## 🧪 テスト用エンドポイント

### 認証必須
- `GET /dev/approvals` - 承認申請一覧取得
- `POST /dev/approvals` - 新規承認申請作成
- `POST /dev/approvals/{requestId}/approve` - 承認
- `POST /dev/approvals/{requestId}/reject` - 却下

### 公開（認証不要）
- `GET /dev/approvals/{requestId}` - 申請詳細取得
- `POST /dev/approvals/{requestId}/submit` - フォーム送信

---

## 📋 Lambda関数のIAM権限設定

各Lambda関数の実行ロールに以下の権限が必要です:

### 全関数共通
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:271633506783:table/video-nfc-ApprovalRequest-dev",
        "arn:aws:dynamodb:ap-northeast-1:271633506783:table/video-nfc-ApprovalRequest-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:ap-northeast-1:271633506783:video-nfc-alerts-dev"
    }
  ]
}
```

### approveRequest関数のみ追加
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminAddUserToGroup"
      ],
      "Resource": "arn:aws:cognito-idp:ap-northeast-1:271633506783:userpool/ap-northeast-1_gtvMJ70ot"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:271633506783:table/VideoNfcOrganizationTable-dev"
    }
  ]
}
```

---

## ✅ 完成後の確認項目

- [ ] 全6つのエンドポイントが作成されている
- [ ] 認証設定が正しく適用されている
- [ ] CORSが有効になっている
- [ ] Lambda関数との統合が完了している
- [ ] `dev` ステージにデプロイされている
- [ ] Lambda実行ロールに必要な権限が付与されている

---

## 🚀 次のステップ

1. Lambda関数のIAM権限を設定
2. フロントエンドからAPIをテスト
3. 承認ワークフローの動作確認

---

## 📞 トラブルシューティング

### エラー: "Missing Authentication Token"
- 原因: エンドポイントが正しくデプロイされていない
- 解決: 「API のデプロイ」を再度実行

### エラー: "Internal Server Error"
- 原因: Lambda関数のIAM権限不足
- 解決: 実行ロールに必要な権限を追加

### エラー: CORS エラー
- 原因: CORS設定が不完全
- 解決: 各リソースで「CORS を有効にする」を再実行

