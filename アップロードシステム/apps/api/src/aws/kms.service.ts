import { Injectable } from '@nestjs/common';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

@Injectable()
export class KmsService {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor() {
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.keyId = process.env.KMS_KEY_ID || '';
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.keyId) {
      // Development mode - return base64 encoded plaintext
      return Buffer.from(plaintext).toString('base64');
    }

    const command = new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: Buffer.from(plaintext),
    });

    const result = await this.kmsClient.send(command);
    return Buffer.from(result.CiphertextBlob!).toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!this.keyId) {
      // Development mode - decode base64
      return Buffer.from(ciphertext, 'base64').toString('utf-8');
    }

    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    });

    const result = await this.kmsClient.send(command);
    return Buffer.from(result.Plaintext!).toString('utf-8');
  }
}

