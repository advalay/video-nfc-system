import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { logInfo, logError } from '../../common/logger';

@Injectable()
export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * トークンを暗号化する
   * @param plaintext - 暗号化するテキスト
   * @returns 暗号化されたテキスト
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      cipher.setAAD(Buffer.from('token-encryption', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // IV + AuthTag + EncryptedData の順で結合
      const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      logInfo('Token encrypted successfully');
      return result;
    } catch (error) {
      logError('Token encryption failed', error as Error);
      throw new Error('トークンの暗号化に失敗しました');
    }
  }

  /**
   * トークンを復号化する
   * @param encryptedText - 暗号化されたテキスト
   * @returns 復号化されたテキスト
   */
  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.algorithm, this.key);
      decipher.setAAD(Buffer.from('token-encryption', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logInfo('Token decrypted successfully');
      return decrypted;
    } catch (error) {
      logError('Token decryption failed', error as Error);
      throw new Error('トークンの復号化に失敗しました');
    }
  }

  /**
   * 暗号化キーを生成する（開発用）
   * @returns 64文字の16進数文字列
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
