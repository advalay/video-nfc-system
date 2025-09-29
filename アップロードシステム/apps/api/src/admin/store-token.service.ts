import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { logInfo, logWarn } from '../common/logger';

export interface StoreTokenInfo {
  rawToken: string;
  hashedToken: string;
  displayName: string;
  generatedAt: Date;
}

@Injectable()
export class StoreTokenService {
  /**
   * ストアトークンを生成
   */
  generateStoreToken(storeName: string, yearMonth?: string): StoreTokenInfo {
    // 年月の生成（指定がない場合は現在の年月）
    const currentDate = new Date();
    const ym = yearMonth || `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // 店舗名の正規化
    const normalizedStoreName = this.normalizeStoreName(storeName);
    
    // 連番の生成（簡易版 - 実際はデータベースで重複チェック）
    const sequenceNumber = this.generateSequenceNumber(normalizedStoreName, ym);
    
    // ストアトークンの組み立て
    const rawToken = `${normalizedStoreName}_${ym}_${sequenceNumber}`;
    
    // ハッシュ化
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    
    logInfo('Store token generated', {
      storeName,
      rawToken,
      hashedToken: hashedToken.substring(0, 20) + '...',
      yearMonth: ym,
      sequenceNumber
    });
    
    return {
      rawToken,
      hashedToken,
      displayName: storeName,
      generatedAt: new Date()
    };
  }

  /**
   * 店舗名を正規化
   */
  private normalizeStoreName(storeName: string): string {
    return storeName
      .toLowerCase() // 小文字に変換
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '_') // 英数字、ひらがな、カタカナ、漢字以外を_に変換
      .replace(/_+/g, '_') // 連続する_を1つに
      .replace(/^_|_$/g, '') // 先頭・末尾の_を削除
      .substring(0, 30); // 最大30文字に制限
  }

  /**
   * 連番を生成（簡易版）
   */
  private generateSequenceNumber(normalizedStoreName: string, yearMonth: string): string {
    // 実際の実装では、データベースで重複チェックを行う
    // ここでは簡易的にタイムスタンプを使用
    const timestamp = Date.now();
    return String(timestamp % 1000).padStart(3, '0');
  }

  /**
   * ストアトークンの検証
   */
  validateStoreToken(rawToken: string, hashedToken: string): boolean {
    const expectedHash = createHash('sha256').update(rawToken).digest('hex');
    return expectedHash === hashedToken;
  }

  /**
   * ストアトークンの形式チェック
   */
  validateStoreTokenFormat(token: string): boolean {
    // 形式: {店舗名}_{年月}_{連番}
    const pattern = /^[a-z0-9_]+_\d{6}_\d{3}$/;
    return pattern.test(token);
  }

  /**
   * ストアトークンから情報を抽出
   */
  parseStoreToken(token: string): { storeName: string; yearMonth: string; sequence: string } | null {
    if (!this.validateStoreTokenFormat(token)) {
      return null;
    }

    const parts = token.split('_');
    if (parts.length < 3) {
      return null;
    }

    const sequence = parts.pop()!;
    const yearMonth = parts.pop()!;
    const storeName = parts.join('_');

    return {
      storeName,
      yearMonth,
      sequence
    };
  }

  /**
   * 重複チェック用のキー生成
   */
  generateDuplicateCheckKey(normalizedStoreName: string, yearMonth: string): string {
    return `${normalizedStoreName}_${yearMonth}`;
  }
}

