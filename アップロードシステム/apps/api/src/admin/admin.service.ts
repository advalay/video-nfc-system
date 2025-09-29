import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StoreTokenService, StoreTokenInfo } from './store-token.service';
import { CreateStoreDto, UpdateStoreDto, RegenerateTokenDto, GoogleFormSubmissionDto } from './dto/store.dto';
import { logInfo, logWarn, logError } from '../common/logger';

export interface Store {
  id: string;
  companyName: string;
  storeName: string;
  contactName: string;
  contactEmail: string;
  notifyEmail?: string;
  youtubeChannelName?: string;
  storeToken: string;
  hashedStoreToken: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreWithTokenInfo extends Store {
  tokenInfo: StoreTokenInfo;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storeTokenService: StoreTokenService,
  ) {}

  /**
   * Googleフォームから店舗を作成
   */
  async createStoreFromGoogleForm(submission: GoogleFormSubmissionDto): Promise<StoreWithTokenInfo> {
    try {
      logInfo('Creating store from Google Form submission', { 
        companyName: submission.companyName,
        storeName: submission.storeName 
      });

      // ストアトークンの生成
      const tokenInfo = this.storeTokenService.generateStoreToken(submission.storeName);
      
      // 重複チェック
      await this.checkStoreTokenUniqueness(tokenInfo.rawToken);

      // データベースに保存（まずCompanyを作成または取得）
      const company = await this.databaseService.prisma.company.upsert({
        where: { name: submission.companyName },
        update: {},
        create: { name: submission.companyName },
      });

      const store = await this.databaseService.prisma.store.create({
        data: {
          companyId: company.id,
          companyName: submission.companyName,
          storeName: submission.storeName,
          contactName: submission.contactName,
          contactEmail: submission.contactEmail,
          storeToken: tokenInfo.rawToken,
          storeTokenHash: tokenInfo.hashedToken,
          enabled: true,
          formSubmissionId: submission.formSubmissionId,
        },
      });

      logInfo('Store created successfully', { 
        storeId: store.id,
        storeToken: tokenInfo.rawToken 
      });

      return {
        ...store,
        tokenInfo,
      };
    } catch (error) {
      logError('Failed to create store from Google Form', error, { submission });
      throw error;
    }
  }

  /**
   * 店舗一覧を取得
   */
  async getStores(page: number = 1, limit: number = 20): Promise<{ stores: Store[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
      const [stores, total] = await Promise.all([
      this.databaseService.prisma.store.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          storeName: true,
          contactName: true,
          contactEmail: true,
          notifyEmail: true,
          youtubeChannelName: true,
          storeToken: true,
          storeTokenHash: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.databaseService.prisma.store.count(),
    ]);

    return {
      stores,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 店舗詳細を取得
   */
  async getStoreById(id: string): Promise<StoreWithTokenInfo> {
    const store = await this.databaseService.prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException(`店舗ID ${id} が見つかりません`);
    }

    const tokenInfo = this.storeTokenService.parseStoreToken(store.storeToken);
    if (!tokenInfo) {
      logWarn('Invalid store token format', { storeId: id, storeToken: store.storeToken });
    }

    return {
      ...store,
      hashedStoreToken: store.storeTokenHash,
      tokenInfo: tokenInfo ? {
        rawToken: store.storeToken,
        hashedToken: store.storeTokenHash,
        displayName: store.storeName,
        generatedAt: store.createdAt,
      } : null as any,
    };
  }

  /**
   * ストアトークンで店舗を取得
   */
  async getStoreByToken(storeToken: string): Promise<Store | null> {
    const hashedToken = this.storeTokenService.generateStoreToken(storeToken).hashedToken;
    
    const store = await this.databaseService.prisma.store.findFirst({
      where: { 
        OR: [
          { storeToken },
          { storeTokenHash: hashedToken }
        ]
      },
    });

    return store ? {
      ...store,
      hashedStoreToken: store.storeTokenHash,
    } : null;
  }

  /**
   * 店舗情報を更新
   */
  async updateStore(id: string, updateData: UpdateStoreDto): Promise<Store> {
    const existingStore = await this.getStoreById(id);
    if (!existingStore) {
      throw new NotFoundException(`店舗ID ${id} が見つかりません`);
    }

    try {
      const updatedStore = await this.databaseService.prisma.store.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      logInfo('Store updated successfully', { storeId: id, updateData });
      return {
        ...updatedStore,
        hashedStoreToken: updatedStore.storeTokenHash,
      };
    } catch (error) {
      logError('Failed to update store', error, { storeId: id, updateData });
      throw error;
    }
  }

  /**
   * ストアトークンを再生成
   */
  async regenerateStoreToken(id: string, regenerateData: RegenerateTokenDto): Promise<StoreWithTokenInfo> {
    const existingStore = await this.getStoreById(id);
    if (!existingStore) {
      throw new NotFoundException(`店舗ID ${id} が見つかりません`);
    }

    try {
      // 新しいトークンを生成
      const newTokenInfo = this.storeTokenService.generateStoreToken(
        existingStore.storeName,
        regenerateData.yearMonth
      );

      // 重複チェック
      await this.checkStoreTokenUniqueness(newTokenInfo.rawToken, id);

      // データベースを更新
      const updatedStore = await this.databaseService.prisma.store.update({
        where: { id },
        data: {
          storeToken: newTokenInfo.rawToken,
          storeTokenHash: newTokenInfo.hashedToken,
          updatedAt: new Date(),
        },
      });

      logInfo('Store token regenerated successfully', { 
        storeId: id, 
        oldToken: existingStore.storeToken,
        newToken: newTokenInfo.rawToken 
      });

      return {
        ...updatedStore,
        hashedStoreToken: updatedStore.storeTokenHash,
        tokenInfo: newTokenInfo,
      };
    } catch (error) {
      logError('Failed to regenerate store token', error, { storeId: id, regenerateData });
      throw error;
    }
  }

  /**
   * 店舗の有効/無効を切り替え
   */
  async toggleStoreStatus(id: string): Promise<Store> {
    const existingStore = await this.getStoreById(id);
    if (!existingStore) {
      throw new NotFoundException(`店舗ID ${id} が見つかりません`);
    }

    try {
      const updatedStore = await this.databaseService.prisma.store.update({
        where: { id },
        data: {
          enabled: !existingStore.enabled,
          updatedAt: new Date(),
        },
      });

      logInfo('Store status toggled', { 
        storeId: id, 
        oldStatus: existingStore.enabled,
        newStatus: updatedStore.enabled 
      });

      return {
        ...updatedStore,
        hashedStoreToken: updatedStore.storeTokenHash,
      };
    } catch (error) {
      logError('Failed to toggle store status', error, { storeId: id });
      throw error;
    }
  }

  /**
   * ストアトークンの重複チェック
   */
  private async checkStoreTokenUniqueness(token: string, excludeId?: string): Promise<void> {
    const existingStore = await this.databaseService.prisma.store.findFirst({
      where: {
        storeToken: token,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existingStore) {
      throw new ConflictException(`ストアトークン '${token}' は既に使用されています`);
    }
  }

  /**
   * 店舗の統計情報を取得
   */
  async getStoreStatistics(): Promise<{
    totalStores: number;
    activeStores: number;
    inactiveStores: number;
    storesCreatedThisMonth: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalStores,
      activeStores,
      inactiveStores,
      storesCreatedThisMonth,
    ] = await Promise.all([
      this.databaseService.prisma.store.count(),
      this.databaseService.prisma.store.count({ where: { enabled: true } }),
      this.databaseService.prisma.store.count({ where: { enabled: false } }),
      this.databaseService.prisma.store.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalStores,
      activeStores,
      inactiveStores,
      storesCreatedThisMonth,
    };
  }
}
