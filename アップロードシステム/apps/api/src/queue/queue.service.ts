import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService {
  private redis: IORedis | null = null;
  private uploadQueue: Queue | null = null;

  constructor() {
    try {
      this.redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.uploadQueue = new Queue('upload', { connection: this.redis });
    } catch (error) {
      console.warn('Redis not available, queue operations will be mocked');
    }
  }

  async addUploadJob(data: {
    jobId: string;
    storeId: string;
    fileUri: string;
    title: string;
    serialNo: string;
  }) {
    if (!this.uploadQueue) {
      console.log('Queue not available, mocking job addition:', data);
      return { id: 'mock-job-id' };
    }
    
    return this.uploadQueue.add('upload-to-youtube', data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  getUploadQueue() {
    return this.uploadQueue;
  }

  async close() {
    if (this.uploadQueue) {
      await this.uploadQueue.close();
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
