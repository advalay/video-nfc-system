import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 管理ダッシュボード用のテストデータを作成中...');

  // 既存のデータをクリア
  await prisma.uploadJob.deleteMany();
  await prisma.video.deleteMany();
  await prisma.youTubeChannel.deleteMany();
  await prisma.store.deleteMany();
  await prisma.company.deleteMany();

  // 会社を作成
  const company1 = await prisma.company.create({
    data: {
      name: '株式会社テスト',
    },
  });

  const company2 = await prisma.company.create({
    data: {
      name: 'サンプル商事',
    },
  });

  // 店舗を作成
  const store1 = await prisma.store.create({
    data: {
      companyId: company1.id,
      companyName: '株式会社テスト',
      storeName: '新宿店',
      contactName: '田中太郎',
      contactEmail: 'tanaka@test.com',
      notifyEmail: 'notify@test.com',
      youtubeChannelName: 'テスト新宿チャンネル',
      storeToken: 'shinjuku_202501_001',
      storeTokenHash: createHash('sha256').update('shinjuku_202501_001').digest('hex'),
      enabled: true,
      formSubmissionId: 'form_test_001',
    },
  });

  const store2 = await prisma.store.create({
    data: {
      companyId: company1.id,
      companyName: '株式会社テスト',
      storeName: '渋谷店',
      contactName: '佐藤花子',
      contactEmail: 'sato@test.com',
      youtubeChannelName: 'テスト渋谷チャンネル',
      storeToken: 'shibuya_202501_001',
      storeTokenHash: createHash('sha256').update('shibuya_202501_001').digest('hex'),
      enabled: true,
      formSubmissionId: 'form_test_002',
    },
  });

  const store3 = await prisma.store.create({
    data: {
      companyId: company2.id,
      companyName: 'サンプル商事',
      storeName: '秋葉原店',
      contactName: '山田次郎',
      contactEmail: 'yamada@sample.com',
      storeToken: 'akihabara_202501_001',
      storeTokenHash: createHash('sha256').update('akihabara_202501_001').digest('hex'),
      enabled: false, // 無効な店舗
      formSubmissionId: 'form_test_003',
    },
  });

  // 今月作成された店舗（テスト用）
  const store4 = await prisma.store.create({
    data: {
      companyId: company2.id,
      companyName: 'サンプル商事',
      storeName: '池袋店',
      contactName: '鈴木三郎',
      contactEmail: 'suzuki@sample.com',
      notifyEmail: 'notify@sample.com',
      storeToken: 'ikebukuro_202501_001',
      storeTokenHash: createHash('sha256').update('ikebukuro_202501_001').digest('hex'),
      enabled: true,
      formSubmissionId: 'form_test_004',
    },
  });

  console.log('✅ テストデータの作成が完了しました！');
  console.log(`📊 作成されたデータ:`);
  console.log(`   - 会社: ${company1.name}, ${company2.name}`);
  console.log(`   - 店舗: ${store1.storeName}, ${store2.storeName}, ${store3.storeName}, ${store4.storeName}`);
  console.log(`   - アクティブ店舗: 3件`);
  console.log(`   - 無効店舗: 1件`);
  console.log(`   - 今月新規: 1件`);
}

main()
  .catch((e) => {
    console.error('❌ テストデータの作成に失敗しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
