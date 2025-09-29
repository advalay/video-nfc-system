import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 アップロード統計用のテストデータを作成中...');

  // 既存の店舗を取得
  const stores = await prisma.store.findMany();
  
  if (stores.length === 0) {
    console.log('❌ 店舗データが見つかりません。先に店舗データを作成してください。');
    return;
  }

  console.log(`📊 ${stores.length}件の店舗でアップロード統計データを作成します`);

  // 過去30日間のデータを生成
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);

    for (const store of stores) {
      // ランダムにアップロード数を決定（0-10件）
      const uploadCount = Math.floor(Math.random() * 11);
      
      if (uploadCount === 0) {
        // アップロードがない日はスキップ
        continue;
      }

      // 成功率をランダムに決定（80-100%）
      const successRate = 0.8 + Math.random() * 0.2;
      const successCount = Math.floor(uploadCount * successRate);
      const failedCount = uploadCount - successCount;

      // ランダムなファイルサイズを生成（10MB-500MB）
      const totalSize = uploadCount * (10 * 1024 * 1024 + Math.random() * 490 * 1024 * 1024);

      await prisma.uploadStats.upsert({
        where: {
          storeId_date: {
            storeId: store.id,
            date: date,
          },
        },
        update: {
          uploadCount,
          successCount,
          failedCount,
          totalSize: BigInt(Math.floor(totalSize)),
          updatedAt: new Date(),
        },
        create: {
          storeId: store.id,
          date: date,
          uploadCount,
          successCount,
          failedCount,
          totalSize: BigInt(Math.floor(totalSize)),
        },
      });
    }
  }

  // 統計情報を表示
  const totalStats = await prisma.uploadStats.aggregate({
    _sum: {
      uploadCount: true,
      successCount: true,
      failedCount: true,
      totalSize: true,
    },
    _count: {
      id: true,
    },
  });

  console.log('✅ アップロード統計データの作成が完了しました！');
  console.log('📊 作成された統計データ:');
  console.log(`   - 総レコード数: ${totalStats._count.id}件`);
  console.log(`   - 総アップロード数: ${totalStats._sum.uploadCount}件`);
  console.log(`   - 総成功数: ${totalStats._sum.successCount}件`);
  console.log(`   - 総失敗数: ${totalStats._sum.failedCount}件`);
  console.log(`   - 総ファイルサイズ: ${formatFileSize(Number(totalStats._sum.totalSize || BigInt(0)))}`);
  
  if (totalStats._sum.uploadCount) {
    const successRate = (totalStats._sum.successCount || 0) / totalStats._sum.uploadCount * 100;
    console.log(`   - 全体成功率: ${successRate.toFixed(1)}%`);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
