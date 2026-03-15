import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─────────────────────────────────────────────────────────────
  // VIDEO
  // ─────────────────────────────────────────────────────────────

  @Get('videos/:videoId')
  @ApiOperation({
    summary: 'Get video analytics',
    description:
      'Returns full analytics for a single video grouped by platform with history. Accessible by the business owner of the campaign or the creator who submitted the video.',
  })
  @ApiParam({ name: 'videoId', type: Number })
  getVideoAnalytics(
    @Param('videoId', ParseIntPipe) videoId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getVideoAnalytics(videoId, user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // CAMPAIGN  (business only)
  // ─────────────────────────────────────────────────────────────

  @Get('campaigns/:campaignId')
  @Roles('business')
  @ApiOperation({
    summary: 'Campaign overview',
    description:
      'Full campaign analytics: budget, participant counts, video counts, aggregated views/engagement across all videos broken down by platform.',
  })
  @ApiParam({ name: 'campaignId', type: Number })
  getCampaignOverview(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getCampaignOverview(campaignId, user.id);
  }

  @Get('campaigns/:campaignId/videos')
  @Roles('business')
  @ApiOperation({
    summary: 'Campaign videos with analytics',
    description:
      'All videos in a campaign with their latest analytics per platform (views, likes, comments, etc).',
  })
  @ApiParam({ name: 'campaignId', type: Number })
  getCampaignVideos(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getCampaignVideos(campaignId, user.id);
  }

  @Get('campaigns/:campaignId/budget')
  @Roles('business')
  @ApiOperation({
    summary: 'Campaign budget tracking',
    description: 'Total budget, amount spent, and remaining budget for a campaign.',
  })
  @ApiParam({ name: 'campaignId', type: Number })
  getCampaignBudget(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getCampaignBudget(campaignId, user.id);
  }

  @Get('campaigns/:campaignId/spend')
  @Roles('business')
  @ApiOperation({
    summary: 'Campaign spend & transactions',
    description:
      'Budget tracking plus all business transactions. Filter by date range with `from` and `to` query params.',
  })
  @ApiParam({ name: 'campaignId', type: Number })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string e.g. 2025-01-01' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string e.g. 2025-12-31' })
  getCampaignSpend(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getCampaignSpend(campaignId, user.id, {
      from,
      to,
    });
  }

  @Get('campaigns/:campaignId/earnings')
  @Roles('business')
  @ApiOperation({
    summary: 'Campaign creator earnings',
    description:
      'Per-creator earnings breakdown for a campaign, aggregated from video analytics earnings_amount field.',
  })
  @ApiParam({ name: 'campaignId', type: Number })
  getCampaignEarnings(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getCampaignEarnings(campaignId, user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // BUSINESS  (business only)
  // ─────────────────────────────────────────────────────────────

  @Get('business/overview')
  @Roles('business')
  @ApiOperation({
    summary: 'Business overview analytics',
    description:
      'Total campaigns, videos, spend, and aggregated views/engagement across all campaigns and platforms. Also returns account balances.',
  })
  getBusinessOverview(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getBusinessOverview(user.id);
  }

  @Get('business/spend')
  @Roles('business')
  @ApiOperation({
    summary: 'Business all transactions',
    description: 'Paginated list of all business transactions. Filter by date range.',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getBusinessSpend(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getBusinessSpend(user.id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('business/campaigns')
  @Roles('business')
  @ApiOperation({
    summary: 'Business per-campaign breakdown',
    description:
      'All campaigns with participant counts, video counts, budget summary, and aggregated analytics per campaign.',
  })
  getBusinessCampaigns(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getBusinessCampaigns(user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // CREATOR  (creator only)
  // ─────────────────────────────────────────────────────────────

  @Get('creator/overview')
  @Roles('creator')
  @ApiOperation({
    summary: 'Creator overview analytics',
    description:
      'Total campaigns participated, videos submitted, total earnings, and aggregated views/engagement across all videos. Also returns account balances.',
  })
  getCreatorOverview(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getCreatorOverview(user.id);
  }

  @Get('creator/earnings')
  @Roles('creator')
  @ApiOperation({
    summary: 'Creator earnings & transactions',
    description: 'Paginated list of all creator transactions. Filter by date range.',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getCreatorEarnings(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getCreatorEarnings(user.id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('creator/videos')
  @Roles('creator')
  @ApiOperation({
    summary: 'Creator videos with analytics',
    description:
      'All videos submitted by the creator with latest analytics per platform and total earnings per video.',
  })
  getCreatorVideos(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getCreatorVideos(user.id);
  }

  @Get('creator/campaigns')
  @Roles('creator')
  @ApiOperation({
    summary: 'Creator per-campaign breakdown',
    description:
      'All campaigns the creator has participated in with video counts, analytics totals, and earnings per campaign.',
  })
  getCreatorCampaigns(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getCreatorCampaigns(user.id);
  }
}
