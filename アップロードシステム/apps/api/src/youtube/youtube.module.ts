import { Global, Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

@Global()
@Module({
  providers: [YoutubeService],
  exports: [YoutubeService],
})
export class YoutubeModule {}
