# Amplify デプロイ失敗の即時解決メモ

本プロジェクトのAmplifyビルドで発生した代表的なエラーと、実際に効果があった対処を一箇所にまとめました。再発時は上から順に確認してください。

## 1) TypeScript が無い扱いになる / devDependencies が入らない
- 症状: Amplify ビルドログに `Please install typescript and @types/node`、`Next.js build worker exited with code: 1`
- 原因: Amplify の `npm ci`/`npm install` が devDependencies をスキップするケースがある
- 対処: ルートに  を追加し、devDependencies を強制インストール



→ これで  /  など devDependencies が必ず入る。

## 2) ライブラリ不足・バージョン不整合
- 症状: 
- 対処:  の dependencies に追加（必要なバージョンを固定）



※  は新しすぎるバージョンでアイコン解決エラーが出やすいため、一旦  に固定。

## 3) プロジェクト内部の不足ファイル
- 症状:  / 
- 対処: 以下を追加し、 で無視されている場合は強制追跡（）
  - （サイズ表記、クリップボード、相対時刻 等）
  - （最小構成の Amplify 設定。）

## 4) Next.js 設定の明示化
- 目的: CI環境での型チェック/ビルド挙動を安定化
- 変更点:
  -  に  を追加
  -  に "type-check": "tsc --noEmit" を追加（任意）

## 5) 代表的なTypeScript修正例
-  が  の場合は  で絞る
-  への動的キー追加は 
-  の  型が厳しい場合は  を付与
- 未定義の引数を渡さない（ など既定値）

## 6) ローカル再現と検証
- ローカルで必ず 
removed 1 package, and audited 626 packages in 1s

170 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities → 
> video-nfc-system@1.0.0 build
> next build

   ▲ Next.js 15.5.4
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 2.6s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/11) ...
   Generating static pages (2/11) 
   Generating static pages (5/11) 
   Generating static pages (8/11) 
 ✓ Generating static pages (11/11)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    3.03 kB         150 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /admin/errors                        4.34 kB         140 kB
├ ○ /admin/organizations                 5.37 kB         141 kB
├ ○ /admin/system-stats                  9.89 kB         150 kB
├ ○ /login                               3.03 kB         150 kB
├ ○ /shop/stats                          4.58 kB         140 kB
├ ○ /upload                              5.23 kB         146 kB
├ ○ /videos                              3.94 kB         145 kB
└ ƒ /watch/[videoId]                     8.01 kB         110 kB
+ First Load JS shared by all             102 kB
  ├ chunks/255-4efeec91c7871d79.js       45.7 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.96 kB


ƒ Middleware                             34.1 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
- 複数 lockfile 警告が出る場合は、可能なら片方に統一。難しい場合でもビルドは通ることが多い

## 7) 環境変数の確認（例）
- （API Gatewayの  エンドポイント）
- Amplify 環境変数にも同名を設定

## 8) 変更の反映フロー（再発時の最短手順）
1.  を確認（）
2. 依存追加・バージョン固定（上記 2）
3. 不足ファイル  の存在確認（上記 3）
4. 
added 625 packages, and audited 626 packages in 21s

170 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities or 
up to date, audited 626 packages in 982ms

170 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities → 
> video-nfc-system@1.0.0 build
> next build

   ▲ Next.js 15.5.4
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 2.9s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/11) ...
   Generating static pages (2/11) 
   Generating static pages (5/11) 
   Generating static pages (8/11) 
 ✓ Generating static pages (11/11)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    3.03 kB         150 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /admin/errors                        4.34 kB         140 kB
├ ○ /admin/organizations                 5.37 kB         141 kB
├ ○ /admin/system-stats                  9.89 kB         150 kB
├ ○ /login                               3.03 kB         150 kB
├ ○ /shop/stats                          4.58 kB         140 kB
├ ○ /upload                              5.23 kB         146 kB
├ ○ /videos                              3.94 kB         145 kB
└ ƒ /watch/[videoId]                     8.01 kB         110 kB
+ First Load JS shared by all             102 kB
  ├ chunks/255-4efeec91c7871d79.js       45.7 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.96 kB


ƒ Middleware                             34.1 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand をローカルで確認
5. コミット＆プッシュ → Amplify 自動デプロイ

以上で、今回の "同じところで落ちる" 系のビルド失敗は解消できました。

## 9) モノレポ構造での404エラー解決（2024年10月）

### 問題の概要
- 症状: ビルドは成功するが、サイトアクセス時に404エラーが発生
- 原因: モノレポ構造でAmplifyが正しいビルド成果物を見つけられない
- 影響: デプロイは成功するが、実際のサイトが表示されない

### 根本原因
1. **リポジトリ構造の誤解**
   - Gitリポジトリのルート: `/Users/kosuke/`
   - Next.jsアプリの場所: `/Users/kosuke/video-nfc-admin/`
   - Amplifyが期待する場所: リポジトリルート直下

2. **amplify.ymlの設定ミス**
   - 初期設定: `baseDirectory: out` ❌
   - 正しい設定: `baseDirectory: video-nfc-admin/out` ✅

### 解決方法
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

### 重要なポイント
- **ディレクトリ移動**: preBuildとbuildの両方で`cd video-nfc-admin`が必要
- **baseDirectory**: リポジトリルートからの相対パスで指定
- **キャッシュパス**: サブディレクトリを考慮したパスに修正

### チェックリスト
- [ ] `amplify.yml`で`cd video-nfc-admin`が設定されている
- [ ] `baseDirectory: video-nfc-admin/out`が設定されている
- [ ] キャッシュパスが`video-nfc-admin/`で始まっている
- [ ] ローカルで`npm run build`が成功する
- [ ] `out/`ディレクトリにビルド成果物が生成される

### 関連ドキュメント
- [AMPLIFY_MONOREPO_TROUBLESHOOTING.md](./AMPLIFY_MONOREPO_TROUBLESHOOTING.md) - 詳細な解決ガイド
