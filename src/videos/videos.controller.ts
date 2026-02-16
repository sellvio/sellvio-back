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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { ReviewVideoDto } from './dto/review-video.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
const VIDEO_STATUS_VALUES = ['approved', 'rejected', 'under_review'];
import {
  VideoResponseDto,
  VideoWithDetailsDto,
  VideoSocialPostDto,
} from './dto/video-response.dto';
import { ApifyHelper } from '../helpers/apify.helper';

@ApiTags('Videos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly apifyHelper: ApifyHelper,
  ) {}

  @ApiOperation({
    summary: 'Submit video for campaign',
    description: `Submit a video for a specific campaign. Only approved creators can submit content.

**Requirements:**
- Creator must be approved for the campaign
- Video must meet campaign requirements
- Valid video URL and metadata required
- Campaign must be active

**Video Processing:**
- Video goes into 'under_review' status
- Business owner reviews and approves/rejects
- Analytics tracking begins after approval
- Creator gets notified of review results`,
  })
  @ApiParam({
    name: 'campaignId',
    type: 'number',
    description: 'Campaign ID to submit video for',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Video submitted successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Not approved for this campaign',
    schema: {
      example: {
        statusCode: 403,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/campaigns/1',
        method: 'POST',
        error: 'Forbidden',
        message: 'You are not approved to submit content for this campaign',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid video data or campaign not active',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/campaigns/1',
        method: 'POST',
        error: 'Bad Request',
        message: 'Campaign is no longer accepting submissions',
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('creator')
  @Post('campaigns/:campaignId')
  create(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() createVideoDto: CreateVideoDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.videosService.create(campaignId, user.id, createVideoDto);
  }

  @ApiOperation({
    summary: 'Get all videos with pagination and filters',
    description: `Retrieve videos with optional filtering and pagination.

**Filters Available:**
- **campaign_id**: Filter by specific campaign
- **creator_id**: Filter by specific creator
- **status**: Filter by video status (under_review, approved, rejected, published)

**Pagination:**
- **page**: Page number (default: 1)
- **limit**: Items per page (default: 10, max: 100)

**Access Control:**
- Creators see only their own videos
- Businesses see videos for their campaigns
- Admins see all videos`,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'campaign_id',
    required: false,
    type: Number,
    description: 'Filter videos by campaign ID',
    example: 1,
  })
  @ApiQuery({
    name: 'creator_id',
    required: false,
    type: Number,
    description: 'Filter videos by creator ID',
    example: 5,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VIDEO_STATUS_VALUES,
    description: 'Filter videos by status',
    example: 'approved',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/VideoWithDetailsDto' },
        },
        total: { type: 'number', example: 75 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 8 },
      },
    },
  })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('campaign_id', new ParseIntPipe({ optional: true }))
    campaign_id?: number,
    @Query('creator_id', new ParseIntPipe({ optional: true }))
    creator_id?: number,
    @Query('status') status?: string,
  ) {
    const filters = { campaign_id, creator_id, status };
    return this.videosService.findAll(pagination, filters);
  }

  @ApiOperation({
    summary: 'Get video by ID',
    description: `Retrieve detailed information about a specific video.

**Includes:**
- Complete video metadata
- Campaign and creator information
- Review status and comments
- Analytics data (if available)
- Social media post information

**Access Control:**
- Creators can view their own videos
- Businesses can view videos for their campaigns
- Public videos are visible to all authenticated users`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Video ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Video retrieved successfully',
    type: VideoWithDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: {
      example: {
        statusCode: 404,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1',
        method: 'GET',
        error: 'Not Found',
        message: 'Video with ID 1 not found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1',
        method: 'GET',
        error: 'Forbidden',
        message: 'You do not have permission to view this video',
      },
    },
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.videosService.findOne(id);
  }

  @ApiOperation({
    summary: 'Review video submission (business only)',
    description: `Review and approve/reject a video submission for your campaign.

**Review Process:**
- Only campaign owners can review videos
- Video must be in 'under_review' status
- Approval enables analytics tracking and payment
- Rejection requires detailed feedback

**Review Options:**
- **approved**: Video meets requirements, creator gets paid
- **rejected**: Video needs changes or doesn't meet standards
- **requires_changes**: Video needs minor modifications

**Post-Review:**
- Creator receives notification with feedback
- Approved videos can be posted to social media
- Analytics tracking begins for approved videos`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Video ID to review',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Video reviewed successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - You can only review videos for your own campaigns',
    schema: {
      example: {
        statusCode: 403,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/review',
        method: 'PATCH',
        error: 'Forbidden',
        message: 'You can only review videos for your own campaigns',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: {
      example: {
        statusCode: 404,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/review',
        method: 'PATCH',
        error: 'Not Found',
        message: 'Video with ID 1 not found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Video cannot be reviewed in current status',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/review',
        method: 'PATCH',
        error: 'Bad Request',
        message: 'Video has already been reviewed',
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Patch(':id/review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewVideoDto: ReviewVideoDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.videosService.review(id, user.id, reviewVideoDto);
  }

  @ApiOperation({
    summary: 'Delete video',
    description: `Delete a video submission.

**Deletion Rules:**
- Creators can delete their own videos (if not yet approved)
- Businesses can delete videos for their campaigns
- Cannot delete approved videos that have been paid
- Cannot delete videos with social media posts

**Alternative Actions:**
- Consider changing status instead of deletion
- Archive videos for historical records
- Soft delete to maintain data integrity`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Video ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Video deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Video deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - You cannot delete this video',
    schema: {
      example: {
        statusCode: 403,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1',
        method: 'DELETE',
        error: 'Forbidden',
        message: 'You cannot delete approved videos that have been paid',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: {
      example: {
        statusCode: 404,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1',
        method: 'DELETE',
        error: 'Not Found',
        message: 'Video with ID 1 not found',
      },
    },
  })
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.videosService.remove(id, user.id, user.user_type_id);
  }

  @ApiOperation({
    summary: 'Get video analytics',
    description: `Retrieve comprehensive analytics for a video across all platforms.

**Analytics Include:**
- View counts and engagement metrics
- Click-through rates and conversions
- Reach and impression data
- Platform-specific performance
- Revenue and earnings data

**Data Sources:**
- Instagram, TikTok, YouTube analytics
- Direct platform API integrations
- Historical performance trends
- Comparative campaign metrics

**Access Control:**
- Creators see analytics for their videos
- Businesses see analytics for their campaign videos
- Real-time updates when available`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Video ID to get analytics for',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Video analytics retrieved successfully',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/VideoAnalyticsDto' },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: {
      example: {
        statusCode: 404,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/analytics',
        method: 'GET',
        error: 'Not Found',
        message: 'Video with ID 1 not found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/analytics',
        method: 'GET',
        error: 'Forbidden',
        message: 'You do not have permission to view analytics for this video',
      },
    },
  })
  @Get(':id/analytics')
  getAnalytics(@Param('id', ParseIntPipe) id: number) {
    return this.videosService.getVideoAnalytics(id);
  }

  @ApiOperation({
    summary: 'Update social media post information',
    description: `Update social media posting information for a video.

**Updates Include:**
- Platform where video was posted
- Direct link to the social media post
- Platform-specific post ID for analytics
- Posting timestamp

**Platform Support:**
- Instagram (posts, reels, stories)
- TikTok videos
- YouTube shorts and videos
- Facebook posts

**Post-Update Actions:**
- Enables analytics tracking
- Triggers payment processing
- Updates campaign statistics
- Notifies stakeholders`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Video ID to update social post info for',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platform: {
          enum: ['instagram', 'tiktok', 'youtube', 'facebook'],
          description: 'Social media platform',
          example: 'instagram',
        },
        post_url: {
          type: 'string',
          description: 'Direct URL to the social media post',
          example: 'https://instagram.com/p/ABC123',
        },
        platform_post_id: {
          type: 'string',
          description: 'Platform-specific post ID (optional)',
          example: 'ABC123DEF456',
        },
      },
      required: ['platform', 'post_url'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Social post information updated successfully',
    type: VideoSocialPostDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: {
      example: {
        statusCode: 404,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/social-post',
        method: 'PATCH',
        error: 'Not Found',
        message: 'Video with ID 1 not found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid social post data',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/videos/1/social-post',
        method: 'PATCH',
        error: 'Bad Request',
        message: 'Invalid platform or post URL format',
      },
    },
  })
  @Patch(':id/social-post')
  updateSocialPost(
    @Param('id', ParseIntPipe) id: number,
    @Body('platform') platform: string,
    @Body('post_url') postUrl: string,
    @Body('platform_post_id') platformPostId?: string,
  ) {
    return this.videosService.updateSocialPost(
      id,
      platform,
      postUrl,
      platformPostId,
    );
  }

  @ApiOperation({ summary: 'Test TikTok views via Apify (batch)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of TikTok video URLs',
        },
      },
      required: ['urls'],
      example: {
        urls: [
          'https://www.tiktok.com/@sellvio_/video/7553328936638254344',
          'https://www.tiktok.com/@sellvio/video/7553281940481133825',
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns view count for the provided TikTok video URL',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        views: { type: 'number' },
        likes: { type: 'number' },
        comments: { type: 'number' },
        shares: { type: 'number' },
      },
      example: {
        url: 'https://www.tiktok.com/@user/video/7221234567890123456',
        views: 1234567,
        likes: 123456,
        comments: 123456,
        shares: 123456,
      },
    },
  })
  @Post('tiktok/views')
  async getTiktokViews(@Body('urls') urls: string[]) {
    const results = await this.apifyHelper.getTiktokVideosInfo(urls);
    return { results };
  }

  @ApiOperation({ summary: 'Test Instagram views via Apify (batch)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of Instagram post/reel/video URLs',
        },
      },
      required: ['urls'],
      example: {
        urls: [
          'https://www.instagram.com/p/DPFGqiKEXW3/',
          'https://www.instagram.com/p/DPHxcHfCaKk/',
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns view count for the provided Instagram URL',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        views: { type: 'number' },
        likes: { type: 'number' },
        comments: { type: 'number' },
        shares: { type: 'number' },
      },
      example: {
        url: 'https://www.instagram.com/reel/CxABC12345_/',
        views: 543210,
        likes: 54321,
        comments: 54321,
        shares: 54321,
      },
    },
  })
  @Post('instagram/views')
  async getInstagramViews(@Body('urls') urls: string[]) {
    const results = await this.apifyHelper.getInstagramVideosInfo(urls);
    return { results };
  }
}
