import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { SecurityService } from './security.service';

@Module({
  imports: [ConfigModule],
  providers: [RateLimitService, SecurityService],
  exports: [RateLimitService, SecurityService],
})
export class SecurityModule {}

