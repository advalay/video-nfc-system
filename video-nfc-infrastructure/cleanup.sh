#!/bin/bash

# プロジェクトのクリーンアップスクリプト
echo "🧹 プロジェクトをクリーンアップ中..."

# CDK出力ディレクトリをクリーンアップ
if [ -d "cdk.out" ]; then
  echo "📦 cdk.out を削除中... ($(du -sh cdk.out 2>/dev/null | cut -f1))"
  rm -rf cdk.out
fi

if [ -d "cdk.out.new" ]; then
  echo "📦 cdk.out.new を削除中..."
  rm -rf cdk.out.new
fi

# Lambda dist をクリーンアップ
if [ -d "lambda/dist" ]; then
  echo "📦 lambda/dist を削除中... ($(du -sh lambda/dist 2>/dev/null | cut -f1))"
  rm -rf lambda/dist
fi

# ログファイルを削除
echo "📝 ログファイルを削除中..."
find . -name "*.log" -type f -delete 2>/dev/null

# 一時ファイルを削除
echo "🗑️  一時ファイルを削除中..."
find . -name "*.tmp" -type f -delete 2>/dev/null
find . -name "*.temp" -type f -delete 2>/dev/null

# .DS_Store を削除
find . -name ".DS_Store" -type f -delete 2>/dev/null

echo "✅ クリーンアップ完了！"
echo ""
echo "💡 再ビルドするには:"
echo "   npm run build (or cdk synth)"

