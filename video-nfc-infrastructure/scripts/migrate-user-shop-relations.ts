import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ENVIRONMENT = process.env.ENV || 'dev';
const SHOP_TABLE = `video-nfc-Shop-${ENVIRONMENT}`;
const ORGANIZATION_TABLE = `video-nfc-Organization-${ENVIRONMENT}`;
const USER_SHOP_RELATION_TABLE = `video-nfc-UserShopRelation-${ENVIRONMENT}`;

interface Shop {
  shopId: string;
  shopName: string;
  organizationId: string;
  email: string;
  createdAt: string;
}

interface Organization {
  organizationId: string;
  organizationName: string;
}

async function migrateUserShopRelations() {
  console.log(`🚀 Starting migration for ${ENVIRONMENT} environment...`);
  console.log(`📋 Tables: ${SHOP_TABLE}, ${ORGANIZATION_TABLE}, ${USER_SHOP_RELATION_TABLE}`);

  // 1. Shopテーブルから全ての販売店を取得
  console.log('\n📥 Fetching all shops...');
  const shopsResult = await dynamodb.send(new ScanCommand({
    TableName: SHOP_TABLE,
  }));

  const shops = shopsResult.Items as Shop[];
  console.log(`✅ Found ${shops.length} shops`);

  if (shops.length === 0) {
    console.log('⚠️  No shops found. Exiting...');
    return;
  }

  // 2. 各販売店について処理
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const shop of shops) {
    try {
      console.log(`\n🔄 Processing shop: ${shop.shopName} (${shop.shopId})`);

      // 組織情報を取得
      const orgResult = await dynamodb.send(new GetCommand({
        TableName: ORGANIZATION_TABLE,
        Key: { organizationId: shop.organizationId },
      }));

      const organization = orgResult.Item as Organization | undefined;

      if (!organization) {
        console.log(`  ⚠️  Organization not found: ${shop.organizationId}`);
        errorCount++;
        continue;
      }

      // UserShopRelationレコードを作成
      const userShopRelation = {
        userId: shop.email,
        shopId: shop.shopId,
        shopName: shop.shopName,
        organizationId: shop.organizationId,
        organizationName: organization.organizationName,
        role: 'shop-admin',
        createdAt: shop.createdAt || new Date().toISOString(),
      };

      // 既存レコードをチェック
      const existingResult = await dynamodb.send(new GetCommand({
        TableName: USER_SHOP_RELATION_TABLE,
        Key: {
          userId: shop.email,
          shopId: shop.shopId,
        },
      }));

      if (existingResult.Item) {
        console.log(`  ⏭️  Already exists, skipping...`);
        skipCount++;
        continue;
      }

      // レコードを挿入
      await dynamodb.send(new PutCommand({
        TableName: USER_SHOP_RELATION_TABLE,
        Item: userShopRelation,
      }));

      console.log(`  ✅ Created relation: ${shop.email} -> ${shop.shopId}`);
      successCount++;

    } catch (error: any) {
      console.error(`  ❌ Error processing shop ${shop.shopId}:`, error.message);
      errorCount++;
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`  📝 Total:   ${shops.length}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!');
  }
}

// 実行
migrateUserShopRelations().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
