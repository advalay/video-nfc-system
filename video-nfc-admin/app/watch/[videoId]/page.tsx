import WatchClient from './WatchClient';

// 静的エクスポート用: 空のパラメータ生成
export function generateStaticParams() {
  return [];
}

export default function WatchPage({ params }: { params: { videoId: string } }) {
  return <WatchClient videoId={params.videoId} />;
}
