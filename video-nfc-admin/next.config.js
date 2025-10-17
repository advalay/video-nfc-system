/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポート（Amplify対応）- 動的ルートのため無効化
  // output: 'export',
  // トレーリングスラッシュを追加
  trailingSlash: true,
  // 画像最適化を無効化（静的エクスポート時に必要）
  images: {
    unoptimized: true,
  },
  // TypeScript設定を明示的に有効化
  typescript: {
    // 型チェックをビルド時に実行
    ignoreBuildErrors: false,
  },

  // 実験的な機能
  experimental: {
    // 必要に応じて追加
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