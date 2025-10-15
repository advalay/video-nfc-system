/** @type {import('next').NextConfig} */
const nextConfig = {
  // ワークスペースルートを明示的に指定
  outputFileTracingRoot: '/Users/kosuke/video-nfc-admin',
  
  // 実験的な機能
  experimental: {
    // 必要に応じて追加
  },
  
  // 画像最適化
  images: {
    domains: ['via.placeholder.com', 'example.com'],
  },
}

module.exports = nextConfig


