/**
 * Google Apps Script for Advalay Store Registration
 * 
 * このスクリプトはGoogleフォームの送信を監視し、
 * 新しい回答が送信された際にAdvalay APIに自動でデータを送信します。
 * 
 * セットアップ手順:
 * 1. Google Apps Script (script.google.com) で新しいプロジェクトを作成
 * 2. このコードをコピー＆ペースト
 * 3. 設定値を更新（API_BASE_URL、WEBHOOK_TOKEN等）
 * 4. Googleフォームにトリガーを設定
 */

// ===== 設定値 =====
const CONFIG = {
  // Advalay APIのベースURL（本番環境の場合は適切なURLに変更）
  API_BASE_URL: 'http://localhost:4000',
  
  // Webhookエンドポイント
  WEBHOOK_ENDPOINT: '/admin/webhook/google-forms',
  
  // セキュリティトークン（本番環境では強力なトークンに変更）
  WEBHOOK_TOKEN: 'your-secure-webhook-token-here',
  
  // フォームID（GoogleフォームのURLから取得）
  FORM_ID: 'your-google-form-id-here',
  
  // フォームの回答シート名
  RESPONSE_SHEET_NAME: 'フォームの回答 1'
};

/**
 * フォーム送信時のトリガー関数
 * Googleフォームの回答が送信された際に自動実行される
 */
function onFormSubmit(e) {
  try {
    console.log('フォーム送信を検出:', e);
    
    // フォーム回答データを取得
    const formData = extractFormData(e);
    
    if (!formData) {
      console.error('フォームデータの取得に失敗しました');
      return;
    }
    
    // Advalay APIに送信
    const result = sendToAdvalayAPI(formData);
    
    if (result.success) {
      console.log('店舗作成成功:', result);
      
      // 成功通知（オプション）
      sendSuccessNotification(formData, result);
    } else {
      console.error('店舗作成失敗:', result);
      
      // エラー通知（オプション）
      sendErrorNotification(formData, result);
    }
    
  } catch (error) {
    console.error('フォーム処理中にエラーが発生:', error);
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
        case '担当者名':
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
    
    console.log('抽出されたフォームデータ:', formData);
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
    
    const payload = {
      ...formData,
      timestamp: new Date().toISOString(),
      source: 'google-forms'
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.WEBHOOK_TOKEN}`,
        'User-Agent': 'GoogleAppsScript-Advalay/1.0'
      },
      payload: JSON.stringify(payload)
    };
    
    console.log('API送信開始:', url, payload);
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('API応答:', responseCode, responseText);
    
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

【ストアトークン】
${result.data.storeToken}

このトークンを使用して動画アップロード機能をご利用いただけます。

何かご不明な点がございましたら、お気軽にお問い合わせください。

--
Advalay運営チーム
    `.trim();
    
    // メール送信（実際の実装では、Gmail APIやメール送信サービスを使用）
    console.log('成功通知メール:', { to: formData.contactEmail, subject, body });
    
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
    
    // メール送信
    console.log('エラー通知メール:', { to: formData.contactEmail, subject, body });
    
    // 管理者にも通知
    console.log('管理者エラー通知:', { formData, result });
    
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
  const testData = {
    companyName: 'テスト企業',
    storeName: 'テスト店舗',
    contactName: 'テスト太郎',
    contactEmail: 'test@example.com',
    youtubeChannelName: 'テストチャンネル',
    formSubmissionId: generateSubmissionId()
  };
  
  console.log('テスト送信開始:', testData);
  
  const result = sendToAdvalayAPI(testData);
  console.log('テスト結果:', result);
  
  return result;
}

/**
 * 設定値の検証
 */
function validateConfig() {
  const errors = [];
  
  if (!CONFIG.API_BASE_URL) {
    errors.push('API_BASE_URLが設定されていません');
  }
  
  if (!CONFIG.WEBHOOK_TOKEN || CONFIG.WEBHOOK_TOKEN === 'your-secure-webhook-token-here') {
    errors.push('WEBHOOK_TOKENが設定されていません');
  }
  
  if (!CONFIG.FORM_ID || CONFIG.FORM_ID === 'your-google-form-id-here') {
    errors.push('FORM_IDが設定されていません');
  }
  
  if (errors.length > 0) {
    console.error('設定エラー:', errors);
    return false;
  }
  
  console.log('設定検証完了');
  return true;
}

// ===== セットアップ関数 =====

/**
 * 初回セットアップ用の関数
 */
function setup() {
  console.log('Advalay Google Apps Script セットアップ開始');
  
  // 設定値の検証
  if (!validateConfig()) {
    console.error('設定値に問題があります。CONFIGを確認してください。');
    return;
  }
  
  // トリガーの設定
  setupFormTrigger();
  
  console.log('セットアップ完了');
}

/**
 * フォーム送信トリガーを設定
 */
function setupFormTrigger() {
  try {
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 新しいトリガーを作成
    const form = FormApp.openById(CONFIG.FORM_ID);
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .for(form)
      .onFormSubmit()
      .create();
    
    console.log('フォーム送信トリガーを設定しました:', trigger.getUniqueId());
    
  } catch (error) {
    console.error('トリガー設定エラー:', error);
  }
}
