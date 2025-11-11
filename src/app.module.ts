import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { VideosModule } from './videos/videos.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SocialMediaModule } from './social-media/social-media.module';
import { AdminModule } from './admin/admin.module';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { EmailModule } from './email/email.module';
import { EnumsController } from './common/enums.controller';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    AuthModule,
    CampaignsModule,
    VideosModule,
    TransactionsModule,
    SocialMediaModule,
    AdminModule,
    EmailModule,
    UploadsModule,
  ],
  controllers: [AppController, EnumsController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
