# GitHub Actions 自動デプロイ設定ガイド

このガイドでは、GitHub ActionsでCDKの自動デプロイを設定する手順を説明します。

## 概要

以下のワークフローが設定されています：

1. **deploy-dev.yml**: `main`ブランチへのプッシュで開発環境にデプロイ
2. **deploy-prod.yml**: `production`ブランチまたはタグで本番環境にデプロイ
3. **pr-check.yml**: プルリクエスト作成時にビルド検証

## セットアップ手順

### 1. AWS IAMユーザーの作成

GitHub Actionsが使用するIAMユーザーを作成します。

#### Dev環境用IAMユーザー

```bash
# 1. IAMユーザーを作成
aws iam create-user --user-name github-actions-video-nfc-dev

# 2. 必要なポリシーをアタッチ
aws iam attach-user-policy \
  --user-name github-actions-video-nfc-dev \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 注: 本番環境では、最小権限の原則に基づき、必要な権限のみを付与してください

# 3. アクセスキーを作成
aws iam create-access-key --user-name github-actions-video-nfc-dev
```

出力されたアクセスキーIDとシークレットアクセスキーを保存してください。

#### Prod環境用IAMユーザー（オプション）

本番環境用に別のIAMユーザーを作成することを推奨します：

```bash
aws iam create-user --user-name github-actions-video-nfc-prod
aws iam attach-user-policy \
  --user-name github-actions-video-nfc-prod \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name github-actions-video-nfc-prod
```

### 2. GitHub Secretsの設定

GitHubリポジトリに移動して、Secretsを設定します。

#### 手順

1. GitHubリポジトリページを開く
2. `Settings` → `Secrets and variables` → `Actions` に移動
3. `New repository secret` をクリック

#### 設定するSecrets

**Dev環境用:**

- `AWS_ACCESS_KEY_ID`: Dev環境のAWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: Dev環境のAWSシークレットアクセスキー

**Prod環境用（別のアクセスキーを使う場合）:**

- `AWS_ACCESS_KEY_ID_PROD`: Prod環境のAWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY_PROD`: Prod環境のAWSシークレットアクセスキー

### 3. GitHub Environmentsの設定（オプション）

環境ごとに承認フローを設定できます。

1. `Settings` → `Environments` に移動
2. `New environment` をクリック
3. 環境名を入力（例: `dev`, `production`）
4. 保護ルールを設定:
   - **Required reviewers**: 本番デプロイ前に承認が必要な場合
   - **Wait timer**: デプロイ前の待機時間
   - **Deployment branches**: デプロイ可能なブランチを制限

### 4. ワークフローのテスト

#### Dev環境

```bash
# 変更をコミット
git add .
git commit -m "Add CORS headers to CloudFront"

# mainブランチにプッシュ（自動デプロイが開始されます）
git push origin main
```

#### Prod環境

```bash
# productionブランチにマージ
git checkout production
git merge main
git push origin production

# または、タグを作成してプッシュ
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 5. デプロイの確認

1. GitHubリポジトリの `Actions` タブを開く
2. 実行中のワークフローを確認
3. ログを確認してエラーがないかチェック

## トラブルシューティング

### デプロイが失敗する場合

1. **認証エラー**
   - GitHub Secretsが正しく設定されているか確認
   - IAMユーザーに適切な権限があるか確認

2. **ビルドエラー**
   - ローカルで `npm ci` と `npx cdk synth` を実行して確認
   - Node.jsのバージョンが一致しているか確認

3. **CDKエラー**
   - CloudFormationのスタック状態を確認
   - AWS コンソールでエラーメッセージを確認

### ワークフローを一時停止する場合

`.github/workflows/` 内のファイル名を変更（例: `deploy-dev.yml.disabled`）

## セキュリティのベストプラクティス

1. **最小権限の原則**
   - 本番環境では、必要最小限の権限のみを付与
   - AdministratorAccessではなく、カスタムポリシーを作成

2. **環境分離**
   - Dev/Prod で異なるIAMユーザーを使用
   - 本番環境にはGitHub Environmentsで承認フローを設定

3. **定期的なアクセスキーのローテーション**
   - 90日ごとにアクセスキーを更新

4. **ログの監視**
   - CloudTrailでAPI呼び出しを監視
   - 不審なアクティビティがないか確認

## 次のステップ

- [ ] IAMユーザーを作成
- [ ] GitHub Secretsを設定
- [ ] GitHub Environmentsを設定（オプション）
- [ ] テストデプロイを実行
- [ ] 本番環境のワークフローを設定
