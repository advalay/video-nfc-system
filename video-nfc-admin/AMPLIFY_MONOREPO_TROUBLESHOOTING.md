# AWS Amplify モノレポ構造での404エラー解決ガイド

## 🚨 問題の概要

AWS Amplifyでモノレポ構造のリポジトリをデプロイする際に、404エラーが発生する問題の解決方法をまとめます。

## 🔍 根本原因

### 1. リポジトリ構造の誤解
```
❌ 問題のある構造
advalay/video-nfc-system (GitHubリポジトリ)
├── video-nfc-admin/          ← Next.jsアプリ（デプロイ対象）
│   ├── package.json
│   ├── next.config.js
│   └── out/
└── video-nfc-infrastructure/ ← CDKアプリ（別プロジェクト）
    ├── package.json
    └── lib/
```

**Amplifyの想定:**
- リポジトリルート = アプリケーションルート
- `package.json`がリポジトリルートにある

**実際の構造:**
- アプリケーションがサブディレクトリにある
- Amplifyが正しい場所を見つけられない

### 2. amplify.ymlの設定ミス

```yaml
# ❌ 間違った設定（404エラーの原因）
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: out  # ← リポジトリルートから見て間違い
    files:
      - '**/*'
```

## ✅ 解決方法

### 1. amplify.ymlの正しい設定

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd video-nfc-admin  # ← サブディレクトリに移動
        - npm ci
    build:
      commands:
        - cd video-nfc-admin  # ← サブディレクトリに移動
        - npm run build
  artifacts:
    baseDirectory: video-nfc-admin/out  # ← 正しいパス
    files:
      - '**/*'
  cache:
    paths:
      - video-nfc-admin/node_modules/**/*  # ← 正しいキャッシュパス
      - video-nfc-admin/.next/cache/**/*
```

### 2. 重要なポイント

#### ディレクトリ移動の必要性
```bash
# preBuildとbuildの両方で必要
- cd video-nfc-admin
```

#### baseDirectoryの正しい指定
```yaml
# リポジトリルートからの相対パス
baseDirectory: video-nfc-admin/out
```

#### キャッシュパスの調整
```yaml
# サブディレクトリを考慮したパス
cache:
  paths:
    - video-nfc-admin/node_modules/**/*
    - video-nfc-admin/.next/cache/**/*
```

## 🔧 トラブルシューティング

### 1. ローカルビルドテスト
```bash
cd video-nfc-admin
npm run build
ls -la out/  # ビルド成果物の確認
```

### 2. Amplifyコンソールでの確認
- ビルドログでエラーがないか確認
- `baseDirectory`が正しく設定されているか確認
- ビルド成果物が正しい場所に生成されているか確認

### 3. よくある問題

#### 問題: ビルドは成功するが404エラー
**原因:** `baseDirectory`の設定ミス
**解決:** `video-nfc-admin/out`に修正

#### 問題: ビルドでエラーが発生
**原因:** `cd video-nfc-admin`が不足
**解決:** preBuildとbuildの両方に追加

#### 問題: キャッシュが効かない
**原因:** キャッシュパスの設定ミス
**解決:** `video-nfc-admin/node_modules/**/*`に修正

## 📋 チェックリスト

### デプロイ前の確認
- [ ] `amplify.yml`で`cd video-nfc-admin`が設定されている
- [ ] `baseDirectory: video-nfc-admin/out`が設定されている
- [ ] キャッシュパスが`video-nfc-admin/`で始まっている
- [ ] ローカルで`npm run build`が成功する
- [ ] `out/`ディレクトリにビルド成果物が生成される

### デプロイ後の確認
- [ ] Amplifyコンソールでビルドが成功している
- [ ] サイトにアクセスして404エラーが発生しない
- [ ] すべてのページが正常に表示される

## 🎯 ベストプラクティス

### 1. リポジトリ設計時の考慮事項
- モノレポ構造を使用する場合は、Amplifyの設定を事前に検討
- サブディレクトリの構造を明確に定義
- `amplify.yml`の設定をリポジトリ構造に合わせる

### 2. 開発フローの改善
- ローカルビルドで事前に動作確認
- CI/CDパイプラインでビルドテストを実行
- デプロイ前にAmplify設定を検証

### 3. チーム開発での注意点
- `amplify.yml`の変更は慎重に行う
- リポジトリ構造の変更時はAmplify設定も更新
- デプロイ問題の解決方法をチームで共有

## 📚 関連ドキュメント

- [AWS Amplify モノレポ対応ガイド](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)
- [Next.js 静的エクスポート設定](https://nextjs.org/docs/advanced-features/static-html-export)
- [Amplify ビルド設定リファレンス](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)

## 🏷️ タグ

`#AWS-Amplify` `#モノレポ` `#Next.js` `#404エラー` `#トラブルシューティング` `#デプロイ`
