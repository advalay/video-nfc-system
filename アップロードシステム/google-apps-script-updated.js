/**
 * Google Apps Script for Advalay Store Registration - 更新版
 * 
 * 実際のフォームID: 1FAIpQLSf2iVR0WymByuuc4CkbNtEfIe1lnjdQGLi6FGkvIe_JrKxVJg
 * 
 * セットアップ手順:
 * 1. Google Apps Script (script.google.com) で新しいプロジェクトを作成
 * 2. このコードをコピー＆ペースト
 * 3. setup()関数を実行してトリガーを設定
 * 4. testFormSubmission()でテスト実行
 */

// ===== 設定値 =====
const CONFIG = {
  // Advalay APIのベースURL（開発環境）
  API_BASE_URL: 'http://localhost:4000',
  
  // Webhookエンドポイント
  WEBHOOK_ENDPOINT: '/admin/webhook/google-forms',
  
  // セキュリティトークン
  WEBHOOK_TOKEN: 'advalay-webhook-token-2025',
  
  // 実際のフォームID
  FORM_ID: '1FAIpQLSf2iVR0WymByuuc4CkbNtEfIe1lnjdQGLi6FGkvIe_JrKxVJg',
  
  // フォームの回答シート名（通常は「フォームの回答 1」）
  RESPONSE_SHEET_NAME: 'フォームの回答 1'
};

/**
 * フォーム送信時のトリガー関数
 * Googleフォームの回答が送信された際に自動実行される
 */
function onFormSubmit(e) {
  try {
    console.log('=== フォーム送信を検出 ===');
    console.log('イベントデータ:', e);
    
    // フォーム回答データを取得
    const formData = extractFormData(e);
    
    if (!formData) {
      console.error('❌ フォームデータの取得に失敗しました');
      return;
    }
    
    console.log('✅ 抽出されたフォームデータ:', formData);
    
    // Advalay APIに送信
    const result = sendToAdvalayAPI(formData);
    
    if (result.success) {
      console.log('🎉 店舗作成成功:', result);
      
      // 成功通知
      sendSuccessNotification(formData, result);
      
    } else {
      console.error('❌ 店舗作成失敗:', result);
      
      // エラー通知
      sendErrorNotification(formData, result);
    }
    
  } catch (error) {
    console.error('💥 フォーム処理中にエラーが発生:', error);
  }
}

/**
 * フォーム回答データを抽出
 */
function extractFormData(e) {
  try {
    const responses = e.values;
    const headers = getFormHeaders();
    
    if (!headers || headers.length === 0) {
      console.error('フォームヘッダーの取得に失敗');
      return null;
    }
    
    console.log('フォームヘッダー:', headers);
    console.log('フォーム回答:', responses);
    
    // ヘッダーと回答をマッピング
    const formData = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = responses[i];
      
      // ヘッダー名を英語のキーにマッピング
      switch (header) {
        case '企業名':
          formData.companyName = value;
          break;
        case '店舗名':
          formData.storeName = value;
          break;
        case '担当者':
          formData.contactName = value;
          break;
        case '担当者メールアドレス':
          formData.contactEmail = value;
          break;
        case 'YouTubeチャンネル名':
          formData.youtubeChannelName = value;
          break;
        default:
          // その他のフィールドは無視
          console.log('未知のフィールド:', header, value);
          break;
      }
    }
    
    // 必須フィールドのチェック
    if (!formData.companyName || !formData.storeName || !formData.contactName || !formData.contactEmail) {
      console.error('必須フィールドが不足:', formData);
      return null;
    }
    
    // フォーム送信IDを生成（重複防止用）
    formData.formSubmissionId = generateSubmissionId();
    
    // タイムスタンプとソースを追加
    formData.timestamp = new Date().toISOString();
    formData.source = 'google-forms';
    
    return formData;
    
  } catch (error) {
    console.error('フォームデータ抽出エラー:', error);
    return null;
  }
}

/**
 * フォームのヘッダーを取得
 */
function getFormHeaders() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
    if (!sheet) {
      console.error('回答シートが見つかりません:', CONFIG.RESPONSE_SHEET_NAME);
      return null;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headers;
    
  } catch (error) {
    console.error('ヘッダー取得エラー:', error);
    return null;
  }
}

/**
 * Advalay APIにデータを送信
 */
function sendToAdvalayAPI(formData) {
  try {
    const url = CONFIG.API_BASE_URL + CONFIG.WEBHOOK_ENDPOINT;
    
    const payload = formData;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript-Advalay/1.0'
      },
      payload: JSON.stringify(payload)
    };
    
    console.log('📤 API送信開始:', url);
    console.log('📤 送信データ:', payload);
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📥 API応答コード:', responseCode);
    console.log('📥 API応答内容:', responseText);
    
    if (responseCode === 200) {
      const result = JSON.parse(responseText);
      return {
        success: true,
        data: result
      };
    } else {
      return {
        success: false,
        error: `HTTP ${responseCode}: ${responseText}`
      };
    }
    
  } catch (error) {
    console.error('API送信エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 成功通知を送信
 */
function sendSuccessNotification(formData, result) {
  try {
    const subject = `[Advalay] 店舗登録完了 - ${formData.companyName}`;
    const body = `
${formData.contactName} 様

この度はAdvalayシステムにお申し込みいただき、ありがとうございます。

店舗登録が正常に完了いたしました。

【登録情報】
企業名: ${formData.companyName}
店舗名: ${formData.storeName}
担当者: ${formData.contactName}
メールアドレス: ${formData.contactEmail}
${formData.youtubeChannelName ? `YouTubeチャンネル: ${formData.youtubeChannelName}` : ''}

【ストアトークン】
${result.data.storeToken}

このトークンを使用して動画アップロード機能をご利用いただけます。

何かご不明な点がございましたら、お気軽にお問い合わせください。

--
Advalay運営チーム
    `.trim();
    
    console.log('📧 成功通知メール:', { to: formData.contactEmail, subject, body });
    
    // Gmailでメール送信（コメントアウト）
    // GmailApp.sendEmail(formData.contactEmail, subject, body);
    
  } catch (error) {
    console.error('成功通知送信エラー:', error);
  }
}

/**
 * エラー通知を送信
 */
function sendErrorNotification(formData, result) {
  try {
    const subject = `[Advalay] 店舗登録エラー - ${formData.companyName}`;
    const body = `
${formData.contactName} 様

申し訳ございませんが、店舗登録処理中にエラーが発生いたしました。

【エラー内容】
${result.error}

【送信データ】
企業名: ${formData.companyName}
店舗名: ${formData.storeName}
担当者: ${formData.contactName}
メールアドレス: ${formData.contactEmail}

システム管理者に確認いたしますので、しばらくお待ちください。
お急ぎの場合は、直接お問い合わせください。

--
Advalay運営チーム
    `.trim();
    
    console.log('📧 エラー通知メール:', { to: formData.contactEmail, subject, body });
    
    // 管理者にも通知
    console.log('🚨 管理者エラー通知:', { formData, result });
    
  } catch (error) {
    console.error('エラー通知送信エラー:', error);
  }
}

/**
 * フォーム送信IDを生成
 */
function generateSubmissionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `form_${timestamp}_${random}`;
}

/**
 * 手動テスト用の関数
 */
function testFormSubmission() {
  console.log('=== 🧪 テスト送信開始 ===');
  
  const testData = {
    companyName: 'テスト企業株式会社',
    storeName: 'テスト店舗',
    contactName: 'テスト太郎',
    contactEmail: 'test@example.com',
    youtubeChannelName: 'テストチャンネル',
    formSubmissionId: generateSubmissionId(),
    timestamp: new Date().toISOString(),
    source: 'google-forms'
  };
  
  console.log('📤 テストデータ:', testData);
  
  const result = sendToAdvalayAPI(testData);
  console.log('📥 テスト結果:', result);
  
  if (result.success) {
    console.log('✅ テスト成功！');
    console.log('🆔 ストアID:', result.data.storeId);
    console.log('🎫 ストアトークン:', result.data.storeToken);
  } else {
    console.log('❌ テスト失敗:', result.error);
  }
  
  return result;
}

/**
 * 設定値の検証
 */
function validateConfig() {
  console.log('=== ⚙️ 設定検証開始 ===');
  
  const errors = [];
  
  if (!CONFIG.API_BASE_URL) {
    errors.push('API_BASE_URLが設定されていません');
  }
  
  if (!CONFIG.FORM_ID) {
    errors.push('FORM_IDが設定されていません');
  }
  
  if (errors.length > 0) {
    console.error('❌ 設定エラー:', errors);
    return false;
  }
  
  console.log('✅ 設定検証完了');
  return true;
}

// ===== セットアップ関数 =====

/**
 * 初回セットアップ用の関数
 */
function setup() {
  console.log('=== 🚀 Advalay Google Apps Script セットアップ開始 ===');
  
  // 設定値の検証
  if (!validateConfig()) {
    console.error('設定値に問題があります。CONFIGを確認してください。');
    return;
  }
  
  // トリガーの設定
  setupFormTrigger();
  
  console.log('✅ セットアップ完了');
}

/**
 * フォーム送信トリガーを設定
 */
function setupFormTrigger() {
  try {
    console.log('=== 🔗 トリガー設定開始 ===');
    
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    console.log('既存のトリガー数:', triggers.length);
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
        console.log('🗑️ 既存のトリガーを削除:', trigger.getUniqueId());
      }
    });
    
    // 新しいトリガーを作成
    const form = FormApp.openById(CONFIG.FORM_ID);
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .for(form)
      .onFormSubmit()
      .create();
    
    console.log('✅ 新しいトリガーを作成:', trigger.getUniqueId());
    
  } catch (error) {
    console.error('❌ トリガー設定エラー:', error);
  }
}

/**
 * 現在の設定を表示
 */
function showConfig() {
  console.log('=== ⚙️ 現在の設定 ===');
  console.log('🌐 API_BASE_URL:', CONFIG.API_BASE_URL);
  console.log('🔗 WEBHOOK_ENDPOINT:', CONFIG.WEBHOOK_ENDPOINT);
  console.log('📝 FORM_ID:', CONFIG.FORM_ID);
  console.log('📋 RESPONSE_SHEET_NAME:', CONFIG.RESPONSE_SHEET_NAME);
}

/**
 * ヘルプ関数
 */
function help() {
  console.log('=== 📚 使用可能な関数 ===');
  console.log('1. setup() - 初回セットアップ');
  console.log('2. testFormSubmission() - テスト送信');
  console.log('3. validateConfig() - 設定検証');
  console.log('4. showConfig() - 設定表示');
  console.log('5. help() - このヘルプ');
  console.log('');
  console.log('=== 🚀 セットアップ手順 ===');
  console.log('1. setup()を実行');
  console.log('2. testFormSubmission()でテスト');
  console.log('3. 実際のフォームで回答送信');
}

/**
 * フォームの詳細を確認
 */
function checkFormDetails() {
  try {
    console.log('=== 📝 フォーム詳細確認 ===');
    
    const form = FormApp.openById(CONFIG.FORM_ID);
    const title = form.getTitle();
    const items = form.getItems();
    
    console.log('📋 フォームタイトル:', title);
    console.log('📊 質問数:', items.length);
    
    items.forEach((item, index) => {
      console.log(`質問${index + 1}:`, item.getTitle());
    });
    
  } catch (error) {
    console.error('❌ フォーム詳細確認エラー:', error);
  }
}
