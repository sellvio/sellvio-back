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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoWithDetailsDto = exports.VideoSocialPostDto = exports.VideoAnalyticsDto = exports.CreatorSummaryDto = exports.CampaignSummaryDto = exports.VideoResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class VideoResponseDto {
    id;
    campaign_id;
    creator_id;
    title;
    description;
    video_url;
    cover_url;
    duration_seconds;
    file_size;
    status;
    submitted_at;
    reviewed_at;
    reviewed_by;
    review_comments;
    posted_to_social;
    created_at;
    updated_at;
}
exports.VideoResponseDto = VideoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Video ID' }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Campaign ID' }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "campaign_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Creator ID' }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "creator_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Amazing Summer Collection Video',
        description: 'Video title',
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'This video showcases our new summer collection',
        description: 'Video description',
        required: false,
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/video.mp4',
        description: 'Video URL',
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "video_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/cover.jpg',
        description: 'Cover image URL',
        required: false,
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "cover_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 30,
        description: 'Video duration in seconds',
        required: false,
    }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "duration_seconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 1024000,
        description: 'File size in bytes',
        required: false,
    }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "file_size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.video_status,
        example: client_1.video_status.under_review,
        description: 'Video status',
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Video submission date',
        required: false,
    }),
    __metadata("design:type", Date)
], VideoResponseDto.prototype, "submitted_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Review date',
        required: false,
    }),
    __metadata("design:type", Date)
], VideoResponseDto.prototype, "reviewed_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 1,
        description: 'ID of reviewer',
        required: false,
    }),
    __metadata("design:type", Number)
], VideoResponseDto.prototype, "reviewed_by", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Great work! Approved.',
        description: 'Review comments',
        required: false,
    }),
    __metadata("design:type", String)
], VideoResponseDto.prototype, "review_comments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: false,
        description: 'Whether posted to social media',
    }),
    __metadata("design:type", Boolean)
], VideoResponseDto.prototype, "posted_to_social", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Creation date',
    }),
    __metadata("design:type", Date)
], VideoResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Last update date',
    }),
    __metadata("design:type", Date)
], VideoResponseDto.prototype, "updated_at", void 0);
class CampaignSummaryDto {
    id;
    name;
    business_profiles;
}
exports.CampaignSummaryDto = CampaignSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Campaign ID' }),
    __metadata("design:type", Number)
], CampaignSummaryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Summer Collection Campaign',
        description: 'Campaign name',
    }),
    __metadata("design:type", String)
], CampaignSummaryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: 'object',
        properties: {
            company_name: { type: 'string', example: 'Acme Corporation' },
        },
        description: 'Business profile information',
    }),
    __metadata("design:type", Object)
], CampaignSummaryDto.prototype, "business_profiles", void 0);
class CreatorSummaryDto {
    first_name;
    last_name;
    nickname;
    profile_image_url;
}
exports.CreatorSummaryDto = CreatorSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', description: 'First name' }),
    __metadata("design:type", String)
], CreatorSummaryDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', description: 'Last name' }),
    __metadata("design:type", String)
], CreatorSummaryDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'johndoe',
        description: 'Nickname',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorSummaryDto.prototype, "nickname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/profile.jpg',
        description: 'Profile image URL',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorSummaryDto.prototype, "profile_image_url", void 0);
class VideoAnalyticsDto {
    id;
    video_id;
    platform;
    views;
    clicks;
    engagement_count;
    reach;
    earnings_amount;
    snapshot_date;
    synced_at;
}
exports.VideoAnalyticsDto = VideoAnalyticsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Analytics ID' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Video ID' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "video_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.social_platform,
        example: client_1.social_platform.instagram,
        description: 'Platform',
    }),
    __metadata("design:type", String)
], VideoAnalyticsDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000, description: 'View count' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50, description: 'Click count' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "clicks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Engagement count' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "engagement_count", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000, description: 'Reach count' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "reach", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25.5, description: 'Earnings amount' }),
    __metadata("design:type", Number)
], VideoAnalyticsDto.prototype, "earnings_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01',
        description: 'Analytics snapshot date',
    }),
    __metadata("design:type", Date)
], VideoAnalyticsDto.prototype, "snapshot_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Last sync date',
    }),
    __metadata("design:type", Date)
], VideoAnalyticsDto.prototype, "synced_at", void 0);
class VideoSocialPostDto {
    id;
    video_id;
    platform;
    post_url;
    platform_post_id;
    posted_at;
}
exports.VideoSocialPostDto = VideoSocialPostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Social post ID' }),
    __metadata("design:type", Number)
], VideoSocialPostDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Video ID' }),
    __metadata("design:type", Number)
], VideoSocialPostDto.prototype, "video_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.social_platform,
        example: client_1.social_platform.instagram,
        description: 'Platform',
    }),
    __metadata("design:type", String)
], VideoSocialPostDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://instagram.com/p/ABC123',
        description: 'Post URL',
    }),
    __metadata("design:type", String)
], VideoSocialPostDto.prototype, "post_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ABC123',
        description: 'Platform post ID',
        required: false,
    }),
    __metadata("design:type", String)
], VideoSocialPostDto.prototype, "platform_post_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Post date',
    }),
    __metadata("design:type", Date)
], VideoSocialPostDto.prototype, "posted_at", void 0);
class VideoWithDetailsDto extends VideoResponseDto {
    campaigns;
    creator_profiles;
    video_analytics;
    video_social_posts;
}
exports.VideoWithDetailsDto = VideoWithDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: CampaignSummaryDto,
        description: 'Campaign information',
    }),
    __metadata("design:type", CampaignSummaryDto)
], VideoWithDetailsDto.prototype, "campaigns", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: CreatorSummaryDto,
        description: 'Creator information',
    }),
    __metadata("design:type", CreatorSummaryDto)
], VideoWithDetailsDto.prototype, "creator_profiles", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [VideoAnalyticsDto],
        description: 'Video analytics data',
    }),
    __metadata("design:type", Array)
], VideoWithDetailsDto.prototype, "video_analytics", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [VideoSocialPostDto],
        description: 'Social media posts',
    }),
    __metadata("design:type", Array)
], VideoWithDetailsDto.prototype, "video_social_posts", void 0);
//# sourceMappingURL=video-response.dto.js.map