import { Module } from '@nestjs/common';
import { AnalyticsCronService } from './analytics-cron.service';
import { ApifyHelper } from '../helpers/apify.helper';

@Module({
  providers: [AnalyticsCronService, ApifyHelper],
})
export class AnalyticsModule {}
