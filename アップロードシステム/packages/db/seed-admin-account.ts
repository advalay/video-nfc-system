import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 管理者アカウントを作成中...');

  const email = 'admin@advalay.com';
  const password = 'AdminSecure2025!';
  const name = 'システム管理者';

  // 既存の管理者をチェック
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('⚠️  管理者アカウントは既に存在しています');
    console.log(`   メールアドレス: ${email}`);
    console.log('   既存のアカウントを削除して新しく作成しますか？');
    
    // 既存のアカウントを削除
    await prisma.admin.delete({
      where: { email },
    });
    console.log('   既存のアカウントを削除しました');
  }

  // パスワードをハッシュ化
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 管理者アカウントを作成
  const admin = await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log('✅ 管理者アカウントが作成されました！');
  console.log('📧 ログイン情報:');
  console.log(`   メールアドレス: ${email}`);
  console.log(`   パスワード: ${password}`);
  console.log(`   管理者名: ${name}`);
  console.log(`   権限: ${admin.role}`);
  console.log('');
  console.log('');
  console.log('🔒 セキュリティ要件:');
  console.log('   - 8文字以上');
  console.log('   - 大文字・小文字・数字・記号を含む');
  console.log('   - 一般的なパスワードを避ける');
  console.log('   - 同じ文字の3回以上連続を避ける');
  console.log('');
  console.log('⚠️  本番環境では必ずパスワードを変更してください！');
}

main()
  .catch((e) => {
    console.error('❌ 管理者アカウントの作成に失敗しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
