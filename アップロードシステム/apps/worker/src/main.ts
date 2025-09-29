import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { UploadProcessor } from './processors/upload.processor';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  console.log('🚀 Starting Advalay Worker...');
  console.log('🔧 Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
    REDIS_URL: process.env.REDIS_URL ? '✅ Set' : '❌ Missing',
    AWS_REGION: process.env.AWS_REGION ? '✅ Set' : '❌ Missing',
    S3_BUCKET: process.env.S3_BUCKET ? '✅ Set' : '❌ Missing',
  });

  const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

  const worker = new Worker(
    'upload',
    new UploadProcessor().process,
    {
      connection: redis,
      concurrency: 10, // Process up to 10 jobs concurrently
      limiter: {
        max: 20, // Maximum 20 jobs per time window
        duration: 60 * 60 * 1000, // 1 hour window
      },
    },
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down worker...');
    await worker.close();
    await redis.quit();
    process.exit(0);
  });

  console.log('👂 Worker listening for jobs...');
}

main().catch((error) => {
  console.error('💥 Failed to start worker:', error);
  process.exit(1);
});

