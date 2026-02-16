import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SocialMediaService } from './social-media.service';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { social_platform } from '@prisma/client';

@ApiTags('Social Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-media')
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @ApiOperation({ summary: 'Connect or update social media account' })
  @ApiResponse({
    status: 201,
    description: 'Social media account connected successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only creators can connect social media accounts',
  })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Post('connect')
  connectAccount(
    @Body() connectDto: ConnectSocialAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.socialMediaService.connectAccount(user.id, connectDto);
  }

  @ApiOperation({ summary: 'Get connected social media accounts' })
  @ApiResponse({
    status: 200,
    description: 'Connected accounts retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only creators can view social media accounts',
  })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Get('accounts')
  getConnectedAccounts(@CurrentUser() user: RequestUser) {
    return this.socialMediaService.getConnectedAccounts(user.id);
  }

  @ApiOperation({ summary: 'Disconnect social media account' })
  @ApiResponse({
    status: 200,
    description: 'Social media account disconnected successfully',
  })
  @ApiResponse({ status: 404, description: 'Social media account not found' })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Delete('disconnect/:platform')
  disconnectAccount(
    @Param('platform') platform: social_platform,
    @CurrentUser() user: RequestUser,
  ) {
    return this.socialMediaService.disconnectAccount(user.id, platform);
  }

  @ApiOperation({ summary: 'Refresh access token for social media account' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Social media account not found' })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Patch('refresh-token/:platform')
  refreshToken(
    @Param('platform') platform: social_platform,
    @CurrentUser() user: RequestUser,
    @Body('access_token') accessToken: string,
    @Body('refresh_token') refreshToken?: string,
    @Body('expires_at') expiresAt?: string,
  ) {
    return this.socialMediaService.refreshToken(
      user.id,
      platform,
      accessToken,
      refreshToken,
      expiresAt,
    );
  }

  @ApiOperation({ summary: 'Sync account data from social platform' })
  @ApiResponse({
    status: 200,
    description: 'Account data synchronized successfully',
  })
  @ApiResponse({ status: 404, description: 'Social media account not found' })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Patch('sync/:platform')
  syncAccountData(
    @Param('platform') platform: social_platform,
    @CurrentUser() user: RequestUser,
    @Body() accountData: any,
  ) {
    return this.socialMediaService.syncAccountData(
      user.id,
      platform,
      accountData,
    );
  }

  @ApiOperation({
    summary: 'Get analytics for connected social media accounts',
  })
  @ApiQuery({ name: 'platform', required: false, enum: social_platform })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Get('analytics')
  getAccountAnalytics(
    @CurrentUser() user: RequestUser,
    @Query('platform') platform?: social_platform,
  ) {
    return this.socialMediaService.getAccountAnalytics(user.id, platform);
  }

  @ApiOperation({ summary: 'Update social media post for video' })
  @ApiResponse({ status: 200, description: 'Social post updated successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Post('videos/:videoId/social-post')
  updateVideoSocialPost(
    @Param('videoId', ParseIntPipe) videoId: number,
    @CurrentUser() user: RequestUser,
    @Body('platform') platform: social_platform,
    @Body('post_url') postUrl: string,
    @Body('platform_post_id') platformPostId?: string,
  ) {
    return this.socialMediaService.updateVideoSocialPost(
      videoId,
      platform,
      postUrl,
      platformPostId,
    );
  }

  @ApiOperation({ summary: 'Get tokens expiring soon (admin endpoint)' })
  @ApiQuery({
    name: 'days_before',
    required: false,
    type: Number,
    description: 'Days before expiration (default: 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Expiring tokens retrieved successfully',
  })
  @Get('admin/expiring-tokens')
  getExpiringSoonTokens(
    @Query('days_before', new ParseIntPipe({ optional: true }))
    daysBefore?: number,
  ) {
    return this.socialMediaService.getExpiringSoonTokens(daysBefore);
  }
}
