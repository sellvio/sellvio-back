import { ApiProperty } from '@nestjs/swagger';
import {
  campaign_status,
  chat_type,
  creator_type,
  payment_type,
  social_platform,
  participation_status,
} from '@prisma/client';

export class CampaignResponseDto {
  @ApiProperty({ example: 1, description: 'Campaign ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Business ID' })
  business_id: number;

  @ApiProperty({
    example: 'Summer Collection Campaign',
    description: 'Campaign name',
  })
  name: string;

  @ApiProperty({
    example: 'Promote our new summer collection',
    description: 'Campaign description',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 1000.0, description: 'Campaign budget' })
  budget: number;

  @ApiProperty({
    example: false,
    description: 'Is budget hidden from creators',
  })
  budget_hidden: boolean;

  @ApiProperty({ example: 30, description: 'Campaign duration in days' })
  duration_days: number;

  @ApiProperty({ example: '2024-12-31', description: 'Campaign finish date' })
  finish_date: Date;

  @ApiProperty({
    enum: campaign_status,
    example: campaign_status.active,
    description: 'Campaign status',
  })
  status: campaign_status;

  @ApiProperty({
    enum: chat_type,
    example: chat_type.public,
    description: 'Chat type',
  })
  chat_type: chat_type;

  @ApiProperty({
    enum: creator_type,
    isArray: true,
    example: [creator_type.influencer, creator_type.experienced],
    description: 'Target creator types',
  })
  target_creator_types: creator_type[];

  @ApiProperty({
    example: 'Must have experience with beauty products',
    description: 'Additional requirements',
    required: false,
  })
  additional_requirements?: string;

  @ApiProperty({
    enum: payment_type,
    example: payment_type.cost_per_view,
    description: 'Payment type',
  })
  payment_type: payment_type;

  @ApiProperty({ example: 50.0, description: 'Payment amount' })
  payment_amount: number;

  @ApiProperty({ example: 1000, description: 'Payment per quantity' })
  payment_per_quantity: number;

  @ApiProperty({
    example: 'Create engaging 30-second videos',
    description: 'Campaign requirements',
  })
  requirements: string;

  @ApiProperty({
    example: 'Young adults aged 18-35',
    description: 'Target audience',
    required: false,
  })
  target_audience?: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Campaign image URL',
    required: false,
  })
  campaign_image_url?: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Campaign start date',
  })
  start_date: Date;

  @ApiProperty({
    example: '2024-12-31T00:00:00.000Z',
    description: 'Campaign end date',
    required: false,
  })
  end_date?: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Campaign creation date',
  })
  created_at: Date;
}

export class BusinessProfileSummaryDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Company name' })
  company_name: string;

  @ApiProperty({
    example: 'https://company.com/logo.png',
    description: 'Logo URL',
    required: false,
  })
  logo_url?: string;
}

export class CampaignPlatformDto {
  @ApiProperty({
    enum: social_platform,
    example: social_platform.instagram,
    description: 'Social platform',
  })
  platform: social_platform;
}

export class CampaignTagDto {
  @ApiProperty({ example: 'fashion', description: 'Tag name' })
  name: string;
}

export class CampaignWithDetailsDto extends CampaignResponseDto {
  @ApiProperty({
    type: BusinessProfileSummaryDto,
    description: 'Business profile information',
  })
  business_profiles: BusinessProfileSummaryDto;

  @ApiProperty({
    type: [CampaignPlatformDto],
    description: 'Target platforms',
  })
  campaign_platforms: CampaignPlatformDto[];

  @ApiProperty({
    type: [CampaignTagDto],
    description: 'Campaign tags',
  })
  campaign_tags: { tags: CampaignTagDto }[];

  @ApiProperty({
    type: 'object',
    properties: {
      campaign_participants: { type: 'number' },
      campaign_videos: { type: 'number' },
    },
    description: 'Participant and video counts',
  })
  _count: {
    campaign_participants: number;
    campaign_videos: number;
  };
}

export class ParticipationResponseDto {
  @ApiProperty({ example: 1, description: 'Participation ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Campaign ID' })
  campaign_id: number;

  @ApiProperty({ example: 1, description: 'Creator ID' })
  creator_id: number;

  @ApiProperty({
    enum: participation_status,
    example: participation_status.pending,
    description: 'Participation status',
  })
  status: participation_status;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Application date',
  })
  applied_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Approval date',
    required: false,
  })
  approved_at?: Date;

  @ApiProperty({
    example: 1,
    description: 'ID of user who approved',
    required: false,
  })
  approved_by?: number;

  @ApiProperty({
    example: 'Not suitable for this campaign',
    description: 'Rejection reason',
    required: false,
  })
  rejection_reason?: string;
}
