# 企業検索システム - Exa API

業界と地域を選択して、Exa APIを使用して条件に合う企業リストを取得・表示するNext.jsアプリケーションです。

## 技術スタック

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **API**: Exa API (https://api.exa.ai)

## 機能

- 業界と地域による企業検索
- 検索結果をテーブル形式で表示
- 企業名、URL、概要、スコアの表示
- CSVエクスポート機能
- レスポンシブデザイン
- ローディング状態の表示
- エラーハンドリング

## セットアップ

### 1. パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成し、Exa APIキーを設定してください。

```bash
cp .env.local.example .env.local
```

`.env.local`ファイルを編集:

```
EXA_API_KEY=あなたのAPIキー
```

Exa APIキーは[こちら](https://exa.ai)から取得できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

1. **業界を選択**: 製造業、建設業、小売業、運輸業、ITサービス業、医療福祉、教育、観光から選択
2. **地域を選択**: 北海道、東北、関東、中部、近畿、中国、四国、九州から選択
3. **「確定」ボタンをクリック**: 検索が実行されます
4. **結果を確認**: テーブル形式で企業情報が表示されます
5. **CSVエクスポート**: 必要に応じて結果をCSVファイルとしてダウンロードできます

## 検索クエリの仕組み

検索クエリは以下のルールで構築されます:

```
(業界名) (会社概要 OR 企業情報 OR 製品情報) (地域名) site:co.jp
-site:indeed.com -site:wantedly.com -site:note.com -採用情報
```

これにより、日本の企業サイト（.co.jp）から、採用情報や求人サイトを除外した企業情報を取得します。

## プロジェクト構造

```
exa-company-search/
├── app/
│   ├── api/
│   │   └── exa/
│   │       └── route.ts          # Exa API呼び出し処理
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # メインページ（検索フォーム＋結果）
├── components/
│   └── ui/                       # shadcn/uiコンポーネント
│       ├── button.tsx
│       ├── card.tsx
│       ├── select.tsx
│       └── table.tsx
├── lib/
│   ├── exa.ts                    # Exa APIクライアント
│   └── utils.ts                  # ユーティリティ関数
├── .env.local                    # 環境変数（Git管理外）
├── .env.local.example            # 環境変数のサンプル
└── package.json
```

## ビルドとデプロイ

### プロダクションビルド

```bash
npm run build
```

### プロダクション環境での起動

```bash
npm start
```

### Vercelへのデプロイ

1. Vercelアカウントにログイン
2. GitHubリポジトリと連携
3. 環境変数`EXA_API_KEY`を設定
4. デプロイ

## ライセンス

MIT

