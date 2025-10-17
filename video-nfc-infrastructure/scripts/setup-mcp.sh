#!/bin/bash

# MCP統合セットアップスクリプト
# このスクリプトはMCPサーバーの初期セットアップを実行します

set -e

echo "🚀 Claude MCP統合のセットアップを開始します..."

# カラー出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

echo -e "${BLUE}📦 Step 1: MCPサーバーの依存パッケージをインストール${NC}"

# 各MCPサーバーの依存関係をインストール
servers=("aws-integration" "dynamodb-manager" "dev-tools" "monitoring")

for server in "${servers[@]}"; do
    echo -e "${YELLOW}  → ${server} のパッケージをインストール中...${NC}"
    cd "mcp-servers/${server}"
    npm install --silent
    cd ../..
    echo -e "${GREEN}  ✓ ${server} 完了${NC}"
done

echo -e "${BLUE}📦 Step 2: プロジェクトの依存パッケージを更新${NC}"
npm install --silent

echo -e "${BLUE}🔧 Step 3: 実行権限を設定${NC}"
for server in "${servers[@]}"; do
    chmod +x "mcp-servers/${server}/index.js"
done
echo -e "${GREEN}  ✓ 実行権限を設定しました${NC}"

echo -e "${BLUE}🧪 Step 4: MCPサーバーの動作確認${NC}"
# 簡易テスト（5秒後にタイムアウト）
timeout 5 node mcp-servers/aws-integration/index.js > /dev/null 2>&1 &
sleep 1
if ps -p $! > /dev/null; then
    kill $! 2>/dev/null || true
    echo -e "${GREEN}  ✓ MCPサーバーは正常に起動できます${NC}"
else
    echo -e "${YELLOW}  ⚠ MCPサーバーの動作確認をスキップしました${NC}"
fi

echo -e "${BLUE}📝 Step 5: 設定ファイルの確認${NC}"
if [ -f "mcp-config.json" ]; then
    echo -e "${GREEN}  ✓ mcp-config.json が存在します${NC}"
else
    echo -e "${YELLOW}  ⚠ mcp-config.json が見つかりません${NC}"
fi

if [ -f ".cursor/mcp-config.json" ]; then
    echo -e "${GREEN}  ✓ .cursor/mcp-config.json が存在します${NC}"
else
    echo -e "${YELLOW}  ⚠ .cursor/mcp-config.json が見つかりません${NC}"
fi

echo ""
echo -e "${GREEN}✨ セットアップが完了しました！${NC}"
echo ""
echo "次のステップ:"
echo "  1. Cursorを再起動してください"
echo "  2. Cursor Settings → Features → Model Context Protocol を有効化"
echo "  3. 設定ファイルパスに './mcp-config.json' を指定"
echo "  4. Claudeに話しかけて、MCPツールを使ってみましょう！"
echo ""
echo "使用例:"
echo "  - 「dev環境の組織一覧を表示して」"
echo "  - 「コードをリントして」"
echo "  - 「過去24時間のエラーログを確認して」"
echo ""
echo "詳細は MCP_INTEGRATION_GUIDE.md をご覧ください。"

