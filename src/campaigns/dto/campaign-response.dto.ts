import { ApiProperty } from '@nestjs/swagger';
import { chat_type, social_platform } from '@prisma/client';

const CAMPAIGN_STATUS_VALUES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const CREATOR_TYPE_VALUES = ['beginner', 'experienced', 'influencer'];
const PAYMENT_TYPE_VALUES = ['cost_per_view', 'fixed', 'revenue_share'];
const PARTICIPATION_STATUS_VALUES = ['pending', 'approved', 'rejected'];

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
    enum: CAMPAIGN_STATUS_VALUES,
    example: 'active',
    description: 'Campaign status',
  })
  status: string;

  @ApiProperty({
    enum: chat_type,
    example: chat_type.public,
    description: 'Chat type',
  })
  chat_type: chat_type;

  @ApiProperty({
    enum: CREATOR_TYPE_VALUES,
    isArray: true,
    example: ['influencer', 'experienced'],
    description: 'Target creator types',
  })
  target_creator_types: string[];

  @ApiProperty({
    example: 'Must have experience with beauty products',
    description: 'Additional requirements',
    required: false,
  })
  additional_requirements?: string;

  @ApiProperty({
    enum: PAYMENT_TYPE_VALUES,
    example: 'cost_per_view',
    description: 'Payment type',
  })
  payment_type: string;

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
    enum: PARTICIPATION_STATUS_VALUES,
    example: 'pending',
    description: 'Participation status',
  })
  status: string;

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
