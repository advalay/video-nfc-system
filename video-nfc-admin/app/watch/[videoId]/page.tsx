import WatchClient from './WatchClient';

// 静的エクスポート用: 空のパラメータ生成
export async function generateStaticParams() {
  return [];
}

export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  return <WatchClient videoId={videoId} />;
}
