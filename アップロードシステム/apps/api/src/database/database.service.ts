import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseService {
  private _prisma: any;

  get prisma() {
    if (!this._prisma) {
      try {
        const { PrismaClient } = require('@prisma/client');
        this._prisma = new PrismaClient({
          datasources: {
            db: {
              url: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/advalay',
            },
          },
        });
        console.log('✅ Database connection established with PrismaClient');
      } catch (error) {
        console.warn('❌ Database not available, using mock data:', error.message);
        this._prisma = {
          store: {
            findFirst: () => Promise.resolve(null),
            findUnique: () => Promise.resolve(null),
          },
          uploadJob: {
            create: () => Promise.resolve({ id: 'mock-job-id' }),
            update: () => Promise.resolve({}),
            findFirst: () => Promise.resolve(null),
          },
          video: {
            create: () => Promise.resolve({}),
          },
          youTubeChannel: {
            upsert: () => Promise.resolve({}),
          },
          company: {
            upsert: () => Promise.resolve({}),
          },
        } as any;
      }
    }
    return this._prisma;
  }
}
