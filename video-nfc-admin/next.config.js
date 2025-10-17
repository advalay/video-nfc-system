/** @type {import('next').NextConfig} */
const nextConfig = {
  // ワークスペースルートを明示的に指定
  outputFileTracingRoot: '/Users/kosuke/video-nfc-admin',
  // 静的エクスポート用設定
  output: 'export',
  trailingSlash: true,
  
  // 実験的な機能
  experimental: {
    // 必要に応じて追加
  },
  
  // 画像最適化（静的エクスポート時は無効化）
  images: {
    domains: ['via.placeholder.com', 'example.com'],
    unoptimized: true,
  },
  async headers() {
    // 本番のみ強化ヘッダー
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // 最低限のCSP（必要に応じて拡張）
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:" },
        ],
      },
    ];
  },
}

module.exports = nextConfig


