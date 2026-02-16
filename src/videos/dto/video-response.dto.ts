import { ApiProperty } from '@nestjs/swagger';
import { social_platform } from '@prisma/client';

const VIDEO_STATUS_VALUES = ['approved', 'rejected', 'under_review'];

export class VideoResponseDto {
  @ApiProperty({ example: 1, description: 'Video ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Campaign ID' })
  campaign_id: number;

  @ApiProperty({ example: 1, description: 'Creator ID' })
  creator_id: number;

  @ApiProperty({
    example: 'Amazing Summer Collection Video',
    description: 'Video title',
  })
  title: string;

  @ApiProperty({
    example: 'This video showcases our new summer collection',
    description: 'Video description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Video URL',
  })
  video_url: string;

  @ApiProperty({
    example: 'https://example.com/cover.jpg',
    description: 'Cover image URL',
    required: false,
  })
  cover_url?: string;

  @ApiProperty({
    example: 30,
    description: 'Video duration in seconds',
    required: false,
  })
  duration_seconds?: number;

  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
    required: false,
  })
  file_size?: number;

  @ApiProperty({
    enum: VIDEO_STATUS_VALUES,
    example: 'under_review',
    description: 'Video status',
  })
  status: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Video submission date',
    required: false,
  })
  submitted_at?: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Review date',
    required: false,
  })
  reviewed_at?: Date;

  @ApiProperty({
    example: 1,
    description: 'ID of reviewer',
    required: false,
  })
  reviewed_by?: number;

  @ApiProperty({
    example: 'Great work! Approved.',
    description: 'Review comments',
    required: false,
  })
  review_comments?: string;

  @ApiProperty({
    example: false,
    description: 'Whether posted to social media',
  })
  posted_to_social: boolean;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Creation date',
  })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last update date',
  })
  updated_at: Date;
}

export class CampaignSummaryDto {
  @ApiProperty({ example: 1, description: 'Campaign ID' })
  id: number;

  @ApiProperty({
    example: 'Summer Collection Campaign',
    description: 'Campaign name',
  })
  name: string;

  @ApiProperty({
    type: 'object',
    properties: {
      company_name: { type: 'string', example: 'Acme Corporation' },
    },
    description: 'Business profile information',
  })
  business_profiles: {
    company_name: string;
  };
}

export class CreatorSummaryDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  last_name: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Nickname',
    required: false,
  })
  nickname?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL',
    required: false,
  })
  profile_image_url?: string;
}

export class VideoAnalyticsDto {
  @ApiProperty({ example: 1, description: 'Analytics ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Video ID' })
  video_id: number;

  @ApiProperty({
    enum: social_platform,
    example: social_platform.instagram,
    description: 'Platform',
  })
  platform: social_platform;

  @ApiProperty({ example: 1000, description: 'View count' })
  views: number;

  @ApiProperty({ example: 50, description: 'Click count' })
  clicks: number;

  @ApiProperty({ example: 100, description: 'Engagement count' })
  engagement_count: number;

  @ApiProperty({ example: 5000, description: 'Reach count' })
  reach: number;

  @ApiProperty({ example: 25.5, description: 'Earnings amount' })
  earnings_amount: number;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Analytics snapshot date',
  })
  snapshot_date: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Last sync date',
  })
  synced_at: Date;
}

export class VideoSocialPostDto {
  @ApiProperty({ example: 1, description: 'Social post ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Video ID' })
  video_id: number;

  @ApiProperty({
    enum: social_platform,
    example: social_platform.instagram,
    description: 'Platform',
  })
  platform: social_platform;

  @ApiProperty({
    example: 'https://instagram.com/p/ABC123',
    description: 'Post URL',
  })
  post_url: string;

  @ApiProperty({
    example: 'ABC123',
    description: 'Platform post ID',
    required: false,
  })
  platform_post_id?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Post date',
  })
  posted_at: Date;
}

export class VideoWithDetailsDto extends VideoResponseDto {
  @ApiProperty({
    type: CampaignSummaryDto,
    description: 'Campaign information',
  })
  campaigns: CampaignSummaryDto;

  @ApiProperty({
    type: CreatorSummaryDto,
    description: 'Creator information',
  })
  creator_profiles: CreatorSummaryDto;

  @ApiProperty({
    type: [VideoAnalyticsDto],
    description: 'Video analytics data',
  })
  video_analytics: VideoAnalyticsDto[];

  @ApiProperty({
    type: [VideoSocialPostDto],
    description: 'Social media posts',
  })
  video_social_posts: VideoSocialPostDto[];
}
