"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const videos_service_1 = require("./videos.service");
const create_video_dto_1 = require("./dto/create-video.dto");
const review_video_dto_1 = require("./dto/review-video.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const video_response_dto_1 = require("./dto/video-response.dto");
let VideosController = class VideosController {
    videosService;
    constructor(videosService) {
        this.videosService = videosService;
    }
    create(campaignId, createVideoDto, user) {
        return this.videosService.create(campaignId, user.id, createVideoDto);
    }
    findAll(pagination, campaign_id, creator_id, status) {
        const filters = { campaign_id, creator_id, status };
        return this.videosService.findAll(pagination, filters);
    }
    findOne(id) {
        return this.videosService.findOne(id);
    }
    review(id, reviewVideoDto, user) {
        return this.videosService.review(id, user.id, reviewVideoDto);
    }
    remove(id, user) {
        return this.videosService.remove(id, user.id, user.user_type);
    }
    getAnalytics(id) {
        return this.videosService.getVideoAnalytics(id);
    }
    updateSocialPost(id, platform, postUrl, platformPostId) {
        return this.videosService.updateSocialPost(id, platform, postUrl, platformPostId);
    }
};
exports.VideosController = VideosController;
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'campaignId',
        type: 'number',
        description: 'Campaign ID to submit video for',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Video submitted successfully',
        type: video_response_dto_1.VideoResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Post)('campaigns/:campaignId'),
    __param(0, (0, common_1.Param)('campaignId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_video_dto_1.CreateVideoDto, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination (default: 1)',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (default: 10, max: 100)',
        example: 10,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'campaign_id',
        required: false,
        type: Number,
        description: 'Filter videos by campaign ID',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'creator_id',
        required: false,
        type: Number,
        description: 'Filter videos by creator ID',
        example: 5,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: client_1.video_status,
        description: 'Filter videos by status',
        example: client_1.video_status.approved,
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('campaign_id', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('creator_id', new common_1.ParseIntPipe({ optional: true }))),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, Number, Number, String]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Video ID',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Video retrieved successfully',
        type: video_response_dto_1.VideoWithDetailsDto,
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Video ID to review',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Video reviewed successfully',
        type: video_response_dto_1.VideoResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - You can only review videos for your own campaigns',
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Patch)(':id/review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, review_video_dto_1.ReviewVideoDto, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "review", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Video ID to delete',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Video deleted successfully',
        schema: {
            example: {
                success: true,
                message: 'Video deleted successfully',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "remove", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Video ID to get analytics for',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Video analytics retrieved successfully',
        schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/VideoAnalyticsDto' },
        },
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.Get)(':id/analytics'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "getAnalytics", null);
__decorate([
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Video ID to update social post info for',
        example: 1,
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Social post information updated successfully',
        type: video_response_dto_1.VideoSocialPostDto,
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, common_1.Patch)(':id/social-post'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('platform')),
    __param(2, (0, common_1.Body)('post_url')),
    __param(3, (0, common_1.Body)('platform_post_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "updateSocialPost", null);
exports.VideosController = VideosController = __decorate([
    (0, swagger_1.ApiTags)('Videos'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('videos'),
    __metadata("design:paramtypes", [videos_service_1.VideosService])
], VideosController);
//# sourceMappingURL=videos.controller.js.map