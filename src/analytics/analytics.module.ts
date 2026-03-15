import { Module } from '@nestjs/common';
import { AnalyticsCronService } from './analytics-cron.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ApifyHelper } from '../helpers/apify.helper';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsCronService, AnalyticsService, ApifyHelper],
})
export class AnalyticsModule {}
