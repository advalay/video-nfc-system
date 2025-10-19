# 販売店作成API修正計画書

## 問題の概要

### 発生したエラー
```
POST https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/shops 500 (Internal Server Error)

販売店作成エラー: 販売店作成時にエラーが発生しました。
ユーザーアカウントの作成に失敗しました。User account already exists
```

### 原因
`createShop.ts` Lambda関数で、既に同じメールアドレスのCognitoユーザーが存在する場合の処理が不適切。

**問題点:**
1. DynamoDBに販売店データを先に保存
2. その後Cognitoユーザー作成でエラー発生
3. エラー時に販売店データとCognitoユーザーの不整合が発生

## 修正内容

### ファイル: `lambda/src/handlers/createShop.ts`

#### 1. インポートの追加
```typescript
// 修正前
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

// 修正後
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand, AdminGetUserCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
```

#### 2. Cognitoユーザー作成ロジックの改善

**修正箇所:** 97-184行目

**変更内容:**
- 既存ユーザーの存在確認を追加
- 既存ユーザーの場合は属性を更新
- 新規ユーザーの場合は従来通り作成

**主要な変更:**
```typescript
// userExistsフラグをtryブロックの外で宣言（レスポンスで使用するため）
let userExists = false;

try {
  // 1. 既存ユーザーの確認
  try {
    await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }));
    userExists = true;
    logInfo('既存ユーザーを検出', { username }, event);
  } catch (error: any) {
    if (error.name !== 'UserNotFoundException') {
      throw error;
    }
  }

  if (userExists) {
    // 2. 既存ユーザーの場合: 属性を更新
    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: 'custom:shopId', Value: shopId },
        { Name: 'custom:organizationId', Value: organizationId },
        { Name: 'custom:shopName', Value: shopName },
        { Name: 'custom:role', Value: 'shop-admin' },
      ],
    }));

    // グループに追加（既に所属している場合はエラーを無視）
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: 'shop-admin',
      }));
    } catch (error: any) {
      if (error.name !== 'UserNotFoundException') {
        logInfo('グループ追加スキップ（既に所属）', { username }, event);
      }
    }

    logInfo('既存ユーザー更新成功', { username, shopId, organizationId }, event);
  } else {
    // 3. 新規ユーザーの場合: 従来通り作成
    // ... 既存のユーザー作成ロジック
  }
} catch (cognitoError: any) {
  // エラーハンドリング
}
```

#### 3. レスポンスの改善

**修正箇所:** 186-205行目

**変更内容:**
```typescript
return {
  statusCode: 201,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({
    success: true,
    data: {
      shopId,
      shopName,
      email,
      ...(userExists ? {} : { tempPassword }), // 既存ユーザーの場合はパスワードを返さない
      loginUrl: process.env.LOGIN_URL || 'https://your-app.com/login',
      isExistingUser: userExists, // フラグを追加
    },
  }),
};
```

## デプロイ手順

### 方法1: CDKでデプロイ（推奨）

```bash
# 1. Lambda依存関係のインストール
cd /Users/kosuke/video-nfc-infrastructure/lambda
npm install

# 2. Lambda関数のビルド
npm run build

# 3. CDKデプロイ
cd /Users/kosuke/video-nfc-infrastructure
npm install
ENV=dev npx cdk deploy VideoNfcApiStack-dev --require-approval never
```

### 方法2: 直接Lambda更新（代替案）

TypeScriptビルドに問題がある場合:

```bash
# 1. Lambda関数を特定
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `video-nfc-`) && contains(FunctionName, `createShop`)].FunctionName'

# 2. コードをzipして更新
cd lambda
zip -r createShop.zip src/handlers/createShop.ts src/lib/*
aws lambda update-function-code --function-name <関数名> --zip-file fileb://createShop.zip
aws lambda wait function-updated --function-name <関数名>
```

## 検証手順

1. **既存ユーザーでの販売店作成**
   - メールアドレス: `k.shibayama@advalay.jp`
   - 期待結果: エラーなく販売店が作成され、既存ユーザーの属性が更新される
   - レスポンスに `isExistingUser: true` が含まれる
   - `tempPassword` は含まれない

2. **新規ユーザーでの販売店作成**
   - 新しいメールアドレスを使用
   - 期待結果: 販売店とユーザーが両方作成される
   - レスポンスに `isExistingUser: false` と `tempPassword` が含まれる

## 注意事項

### TypeScriptビルドエラーについて
現在 `npm run build` で以下のエラーが発生中:
```
error TS2318: Cannot find global type 'Boolean'.
error TS2318: Cannot find global type 'Object'.
```

**原因候補:**
- `tsconfig.json` の設定不足
- `@types/node` の不足または競合

**対処済みの修正:**
- `tsconfig.json` に `"types": ["node"]` を追加
- `@types/node` をインストール

**まだ解決しない場合:**
1. `lambda/node_modules` を削除して再インストール
2. TypeScriptバージョンの確認・更新
3. 代替案として直接Lambda更新を使用

## ファイル一覧

修正済みファイル:
- ✅ `lambda/src/handlers/createShop.ts` - 主要な修正
- ✅ `lambda/tsconfig.json` - TypeScript設定の改善

未コミット状態:
- `lambda/src/handlers/createShop.ts`
- `lambda/tsconfig.json`

## 参考情報

### 関連する既存のコミット
- `801f83f` - 販売店・組織作成時のCognito権限とshopsフィールド初期化
- `995a64a` - shop-userロールをshop-adminに統一し、APIレスポンス形式を改善

### AWS Cognito グループ
- `system-admin` - システム管理者
- `organization-admin` - パートナー企業管理者
- `shop-admin` - 販売店管理者（旧 `shop-user` から統一）
