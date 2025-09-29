import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { logInfo, logWarn, logError } from '../common/logger';

export interface UploadStatsSummary {
  storeId: string;
  storeName: string;
  companyName: string;
  totalUploads: number;
  totalSuccess: number;
  totalFailed: number;
  totalSize: number;
  averageSize: number;
  successRate: number;
  lastUploadDate?: Date;
  periodStats: {
    date: string;
    uploadCount: number;
    successCount: number;
    failedCount: number;
    totalSize: number;
  }[];
}

export interface UploadStatsFilter {
  startDate?: Date;
  endDate?: Date;
  storeIds?: string[];
  companyIds?: string[];
}

@Injectable()
export class UploadStatsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * アップロード統計を記録（アップロード完了時に呼び出し）
   */
  async recordUploadStats(
    storeId: string,
    uploadSize: number,
    isSuccess: boolean
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 日付のみに正規化

      await this.databaseService.prisma.uploadStats.upsert({
        where: {
          storeId_date: {
            storeId,
            date: today,
          },
        },
        update: {
          uploadCount: { increment: 1 },
          successCount: { increment: isSuccess ? 1 : 0 },
          failedCount: { increment: isSuccess ? 0 : 1 },
          totalSize: { increment: uploadSize },
          updatedAt: new Date(),
        },
        create: {
          storeId,
          date: today,
          uploadCount: 1,
          successCount: isSuccess ? 1 : 0,
          failedCount: isSuccess ? 0 : 1,
          totalSize: uploadSize,
        },
      });

      logInfo('Upload stats recorded', {
        storeId,
        uploadSize,
        isSuccess,
        date: today,
      });
    } catch (error) {
      logError('Failed to record upload stats', error, {
        storeId,
        uploadSize,
        isSuccess,
      });
    }
  }

  /**
   * 店舗ごとのアップロード統計を取得
   */
  async getStoreUploadStats(
    filter: UploadStatsFilter = {}
  ): Promise<UploadStatsSummary[]> {
    try {
      const { startDate, endDate, storeIds, companyIds } = filter;

      // デフォルトの日付範囲（過去30日）
      const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const defaultEndDate = endDate || new Date();

      // 日付を正規化
      defaultStartDate.setHours(0, 0, 0, 0);
      defaultEndDate.setHours(23, 59, 59, 999);

      // 店舗情報と統計データを取得
      const stores = await this.databaseService.prisma.store.findMany({
        where: {
          ...(storeIds && { id: { in: storeIds } }),
          ...(companyIds && { companyId: { in: companyIds } }),
        },
        include: {
          uploadStats: {
            where: {
              date: {
                gte: defaultStartDate,
                lte: defaultEndDate,
              },
            },
            orderBy: { date: 'asc' },
          },
          company: true,
        },
      });

      // 統計を集計
      const summaries: UploadStatsSummary[] = stores.map((store) => {
        const totalUploads = store.uploadStats.reduce((sum, stat) => sum + stat.uploadCount, 0);
        const totalSuccess = store.uploadStats.reduce((sum, stat) => sum + stat.successCount, 0);
        const totalFailed = store.uploadStats.reduce((sum, stat) => sum + stat.failedCount, 0);
        const totalSize = Number(store.uploadStats.reduce((sum, stat) => sum + stat.totalSize, BigInt(0)));
        const averageSize = totalUploads > 0 ? totalSize / totalUploads : 0;
        const successRate = totalUploads > 0 ? (totalSuccess / totalUploads) * 100 : 0;

        // 最新のアップロード日を取得
        const lastUploadDate = store.uploadStats.length > 0 
          ? store.uploadStats[store.uploadStats.length - 1].date 
          : undefined;

        return {
          storeId: store.id,
          storeName: store.storeName,
          companyName: store.companyName,
          totalUploads,
          totalSuccess,
          totalFailed,
          totalSize,
          averageSize,
          successRate,
          lastUploadDate,
          periodStats: store.uploadStats.map((stat) => ({
            date: stat.date.toISOString().split('T')[0],
            uploadCount: stat.uploadCount,
            successCount: stat.successCount,
            failedCount: stat.failedCount,
            totalSize: Number(stat.totalSize),
          })),
        };
      });

      logInfo('Upload stats retrieved', {
        storeCount: summaries.length,
        filter,
      });

      return summaries;
    } catch (error) {
      logError('Failed to get store upload stats', error, { filter });
      throw error;
    }
  }

  /**
   * 全体のアップロード統計を取得
   */
  async getOverallUploadStats(filter: UploadStatsFilter = {}): Promise<{
    totalStores: number;
    totalUploads: number;
    totalSuccess: number;
    totalFailed: number;
    totalSize: number;
    averageSize: number;
    successRate: number;
    topStores: UploadStatsSummary[];
  }> {
    try {
      const storeStats = await this.getStoreUploadStats(filter);

      const totalUploads = storeStats.reduce((sum, store) => sum + store.totalUploads, 0);
      const totalSuccess = storeStats.reduce((sum, store) => sum + store.totalSuccess, 0);
      const totalFailed = storeStats.reduce((sum, store) => sum + store.totalFailed, 0);
      const totalSize = storeStats.reduce((sum, store) => sum + store.totalSize, 0);
      const averageSize = totalUploads > 0 ? totalSize / totalUploads : 0;
      const successRate = totalUploads > 0 ? (totalSuccess / totalUploads) * 100 : 0;

      // アップロード数が多い上位5店舗
      const topStores = storeStats
        .sort((a, b) => b.totalUploads - a.totalUploads)
        .slice(0, 5);

      return {
        totalStores: storeStats.length,
        totalUploads,
        totalSuccess,
        totalFailed,
        totalSize,
        averageSize,
        successRate,
        topStores,
      };
    } catch (error) {
      logError('Failed to get overall upload stats', error, { filter });
      throw error;
    }
  }

  /**
   * 日別アップロード統計を取得
   */
  async getDailyUploadStats(filter: UploadStatsFilter = {}): Promise<{
    date: string;
    totalUploads: number;
    totalSuccess: number;
    totalFailed: number;
    totalSize: number;
    storeCount: number;
  }[]> {
    try {
      const { startDate, endDate, storeIds, companyIds } = filter;

      // デフォルトの日付範囲（過去30日）
      const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const defaultEndDate = endDate || new Date();

      // 日付を正規化
      defaultStartDate.setHours(0, 0, 0, 0);
      defaultEndDate.setHours(23, 59, 59, 999);

      const stats = await this.databaseService.prisma.uploadStats.groupBy({
        by: ['date'],
        where: {
          date: {
            gte: defaultStartDate,
            lte: defaultEndDate,
          },
          store: {
            ...(storeIds && { id: { in: storeIds } }),
            ...(companyIds && { companyId: { in: companyIds } }),
          },
        },
        _sum: {
          uploadCount: true,
          successCount: true,
          failedCount: true,
          totalSize: true,
        },
        _count: {
          storeId: true,
        },
        orderBy: { date: 'asc' },
      });

      return stats.map((stat) => ({
        date: stat.date.toISOString().split('T')[0],
        totalUploads: stat._sum.uploadCount || 0,
        totalSuccess: stat._sum.successCount || 0,
        totalFailed: stat._sum.failedCount || 0,
        totalSize: Number(stat._sum.totalSize || BigInt(0)),
        storeCount: stat._count.storeId,
      }));
    } catch (error) {
      logError('Failed to get daily upload stats', error, { filter });
      throw error;
    }
  }
}
