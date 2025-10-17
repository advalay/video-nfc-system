/** @type {import('next').NextConfig} */
const nextConfig = {
  // Amplifyデプロイ用の静的エクスポート
  output: 'export',

  // TypeScript設定を明示的に有効化
  typescript: {
    // 型チェックをビルド時に実行
    ignoreBuildErrors: false,
  },

  // 実験的な機能
  experimental: {
    // 必要に応じて追加
  },
  
  // 画像最適化
  images: {
    domains: ['via.placeholder.com', 'example.com'],
  },
  async headers() {
    // 本番のみ強化ヘッダー
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;