import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/advalay',
    },
  },
});

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Create test company
    const company = await prisma.company.upsert({
      where: { id: 'comp_test_001' },
      update: {},
      create: {
        id: 'comp_test_001',
        name: 'テスト企業',
      },
    });
    console.log('✅ Company created:', company.id);

    // Generate store token (using simple hash for now)
    const rawStoreToken = 'store_test_token_001';
    const storeTokenHash = createHash('sha256').update(rawStoreToken).digest('hex');

    // Create test store
    const store = await prisma.store.upsert({
      where: { id: 'store_test_001' },
      update: {},
      create: {
        id: 'store_test_001',
        companyId: company.id,
        displayName: 'LAWSON 新宿西口店',
        notifyEmail: 'test@example.com',
        storeTokenHash,
        enabled: true,
      },
    });
    console.log('✅ Store created:', store.id);

    // Create YouTube channel (placeholder - will be updated after OAuth)
    const youtubeChannel = await prisma.youTubeChannel.upsert({
      where: { storeId: store.id },
      update: {},
      create: {
        storeId: store.id,
        channelId: 'UC_test_channel_001',
        channelTitle: 'LAWSON 新宿西口店',
        refreshTokenEnc: 'placeholder_encrypted_token',
        status: 'inactive',
      },
    });
    console.log('✅ YouTube channel created:', youtubeChannel.id);

    console.log('✅ Seeding completed!');
    console.log(`🔗 Test store URL: http://localhost:3000/store/${rawStoreToken}`);
    console.log(`📧 Notify email: ${store.notifyEmail}`);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

