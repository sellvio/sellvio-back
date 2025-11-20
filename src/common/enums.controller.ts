import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import {
  campaign_status,
  channel_type,
  chat_role_type,
  chat_type,
  creator_type,
  participation_status,
  payment_type,
  social_platform,
  transaction_status,
  transaction_type,
  user_status,
  user_type,
  video_status,
  business_industry,
} from '@prisma/client';

@ApiTags('Enums')
@Controller('enums')
export class EnumsController {
  constructor(private readonly prisma: PrismaService) {}

  private readonly enumMap: Record<string, string[]> = {
    user_type: Object.values(user_type),
    user_status: Object.values(user_status),
    campaign_status: Object.values(campaign_status),
    channel_type: Object.values(channel_type),
    chat_role_type: Object.values(chat_role_type),
    chat_type: Object.values(chat_type),
    creator_type: Object.values(creator_type),
    participation_status: Object.values(participation_status),
    payment_type: Object.values(payment_type),
    social_platform: Object.values(social_platform),
    transaction_status: Object.values(transaction_status),
    transaction_type: Object.values(transaction_type),
    video_status: Object.values(video_status),
    business_industry: Object.values(business_industry),
  };

  @ApiOperation({ summary: 'Get all enums' })
  @ApiResponse({ status: 200, description: 'All enums returned' })
  @Get()
  getAll() {
    return this.enumMap;
  }

  @ApiOperation({ summary: 'Get a specific enum by name' })
  @ApiParam({
    name: 'name',
    description:
      'Enum name (e.g., user_type, campaign_status, social_platform, ...)',
    example: 'user_type',
  })
  @ApiResponse({ status: 200, description: 'Enum values returned' })
  @ApiResponse({ status: 404, description: 'Enum not found' })
  @Get(':name')
  getOne(@Param('name') name: string) {
    const values = this.enumMap[name];
    if (!values) {
      return { error: 'Enum not found', available: Object.keys(this.enumMap) };
    }
    return values;
  }

  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({ status: 200, description: 'All tags returned' })
  @Get('tags/all')
  async getTags() {
    return this.prisma.tags.findMany({ select: { id: true, name: true } });
  }

  @ApiOperation({ summary: 'Get all legal statuses' })
  @ApiResponse({ status: 200, description: 'All legal statuses returned' })
  @Get('legal-statuses/all')
  async getLegalStatuses() {
    return this.prisma.legal_statuses.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
