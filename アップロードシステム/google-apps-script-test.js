/**
 * Google Apps Script テスト用関数
 * ローカルAPIのテスト実行用
 */

/**
 * ローカルAPIのテスト実行
 */
function testLocalAPI() {
  console.log('=== 🧪 ローカルAPIテスト開始 ===');
  
  const testData = {
    companyName: 'ローカルテスト企業',
    storeName: 'ローカルテスト店舗',
    contactName: 'ローカル太郎',
    contactEmail: 'local-test@example.com',
    youtubeChannelName: 'ローカルテストチャンネル',
    formSubmissionId: generateSubmissionId(),
    timestamp: new Date().toISOString(),
    source: 'google-forms-local-test'
  };
  
  console.log('📤 テストデータ:', testData);
  
  // ローカルAPIのURL（ngrokが利用できない場合の代替）
  const localApiUrl = 'http://localhost:4000/admin/webhook/google-forms';
  
  try {
    // 注意: このテストはGoogle Apps Scriptからは実行できません
    // ローカル環境でのみ動作します
    console.log('⚠️ 注意: このテストはGoogle Apps Scriptからは実行できません');
    console.log('ローカル環境でcurlコマンドを使用してください:');
    console.log(`curl -X POST "${localApiUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(testData)}'`);
    
    return {
      success: false,
      message: 'ローカルAPIはGoogle Apps Scriptからアクセスできません',
      testCommand: `curl -X POST "${localApiUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(testData)}'`
    };
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * フォーム送信IDを生成
 */
function generateSubmissionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `local_test_${timestamp}_${random}`;
}

/**
 * 設定の確認とテスト手順の表示
 */
function showTestInstructions() {
  console.log('=== 📋 テスト手順 ===');
  console.log('1. ローカルAPIサーバーが動作していることを確認');
  console.log('2. 以下のcurlコマンドをローカル環境で実行:');
  console.log('');
  
  const testData = {
    companyName: 'ローカルテスト企業',
    storeName: 'ローカルテスト店舗',
    contactName: 'ローカル太郎',
    contactEmail: 'local-test@example.com',
    youtubeChannelName: 'ローカルテストチャンネル',
    formSubmissionId: generateSubmissionId(),
    timestamp: new Date().toISOString(),
    source: 'google-forms-local-test'
  };
  
  console.log('curl -X POST "http://localhost:4000/admin/webhook/google-forms" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log(`  -d '${JSON.stringify(testData)}'`);
  console.log('');
  console.log('3. 成功した場合、管理ダッシュボードで新しい店舗を確認');
  console.log('4. 本番環境ではngrokまたはクラウドデプロイが必要');
}
