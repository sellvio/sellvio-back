import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { ApifyHelper } from '../helpers/apify.helper';

@Module({
  controllers: [VideosController],
  providers: [VideosService, ApifyHelper],
  exports: [VideosService],
})
export class VideosModule {}
