import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    MulterModule.register({
      // Default options; storage is configured per-route to customize filenames
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
