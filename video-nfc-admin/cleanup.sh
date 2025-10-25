#!/bin/bash

# プロジェクトのクリーンアップスクリプト
echo "🧹 プロジェクトをクリーンアップ中..."

# Next.jsキャッシュをクリーンアップ
if [ -d ".next" ]; then
  echo "📦 .next を削除中... ($(du -sh .next 2>/dev/null | cut -f1))"
  rm -rf .next
fi

# ビルド出力をクリーンアップ
if [ -d "out" ]; then
  echo "📦 out を削除中... ($(du -sh out 2>/dev/null | cut -f1))"
  rm -rf out
fi

# Amplifyキャッシュをクリーンアップ
if [ -d "amplify/#current-cloud-backend" ]; then
  echo "📦 amplify/#current-cloud-backend を削除中..."
  rm -rf "amplify/#current-cloud-backend"
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

# TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
  echo "📝 TypeScript build info を削除中..."
  rm -f tsconfig.tsbuildinfo
fi

echo "✅ クリーンアップ完了！"
echo ""
echo "💡 再ビルドするには:"
echo "   npm run build"
echo "   または npm run dev で開発サーバーを起動"

