import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { social_platform } from '@prisma/client';

@ApiTags('Enums')
@Controller('enums')
export class EnumsController {
  constructor(private readonly prisma: PrismaService) {}

  // Static enum that still uses Prisma enum (social_platform is still an enum in schema)
  private readonly staticEnums: Record<string, string[]> = {
    social_platform: Object.values(social_platform),
    // chat_type is now a string field, provide static values
    chat_type: ['public', 'private'],
    // user_status is not in lookup tables yet
    user_status: ['active', 'inactive', 'suspended'],
  };

  @ApiOperation({ summary: 'Get all enums/lookup values' })
  @ApiResponse({ status: 200, description: 'All enums returned' })
  @Get()
  async getAll() {
    const [
      userTypes,
      campaignStatuses,
      channelTypes,
      chatRoleTypes,
      creatorTypes,
      participationStatuses,
      paymentTypes,
      videoStatuses,
      businessIndustries,
    ] = await Promise.all([
      this.prisma.user_types.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.campaign_statuses.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.channel_types.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.chat_role_types.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.creator_types.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.participation_statuses.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.payment_types.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.video_statuses.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.business_industries.findMany({ orderBy: { id: 'asc' } }),
    ]);

    return {
      user_type: userTypes.map((t) => ({ id: t.id, value: t.user_type })),
      campaign_status: campaignStatuses.map((t) => ({
        id: t.id,
        value: t.campaign_status,
      })),
      channel_type: channelTypes.map((t) => ({
        id: t.id,
        value: t.channel_type,
      })),
      chat_role_type: chatRoleTypes.map((t) => ({
        id: t.id,
        value: t.chat_role_type,
      })),
      creator_type: creatorTypes.map((t) => ({
        id: t.id,
        value: t.creator_type,
      })),
      participation_status: participationStatuses.map((t) => ({
        id: t.id,
        value: t.participation_status,
      })),
      payment_type: paymentTypes.map((t) => ({
        id: t.id,
        value: t.payment_type,
      })),
      video_status: videoStatuses.map((t) => ({
        id: t.id,
        value: t.video_status,
      })),
      business_industry: businessIndustries.map((t) => ({
        id: t.id,
        value: t.business_industry,
      })),
      // Static enums
      social_platform: this.staticEnums.social_platform,
      chat_type: this.staticEnums.chat_type,
      user_status: this.staticEnums.user_status,
    };
  }

  @ApiOperation({ summary: 'Get a specific enum/lookup by name' })
  @ApiParam({
    name: 'name',
    description:
      'Enum name (e.g., user_type, campaign_status, social_platform, ...)',
    example: 'user_type',
  })
  @ApiResponse({ status: 200, description: 'Enum values returned' })
  @ApiResponse({ status: 404, description: 'Enum not found' })
  @Get(':name')
  async getOne(@Param('name') name: string) {
    const lookupTableMap: Record<string, () => Promise<any[]>> = {
      user_type: () =>
        this.prisma.user_types
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.user_type }))),
      campaign_status: () =>
        this.prisma.campaign_statuses
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.campaign_status }))),
      channel_type: () =>
        this.prisma.channel_types
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.channel_type }))),
      chat_role_type: () =>
        this.prisma.chat_role_types
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.chat_role_type }))),
      creator_type: () =>
        this.prisma.creator_types
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.creator_type }))),
      participation_status: () =>
        this.prisma.participation_statuses
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) =>
            r.map((t) => ({ id: t.id, value: t.participation_status })),
          ),
      payment_type: () =>
        this.prisma.payment_types
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.payment_type }))),
      video_status: () =>
        this.prisma.video_statuses
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) => r.map((t) => ({ id: t.id, value: t.video_status }))),
      business_industry: () =>
        this.prisma.business_industries
          .findMany({ orderBy: { id: 'asc' } })
          .then((r) =>
            r.map((t) => ({ id: t.id, value: t.business_industry })),
          ),
    };

    if (lookupTableMap[name]) {
      return lookupTableMap[name]();
    }

    if (this.staticEnums[name]) {
      return this.staticEnums[name];
    }

    return {
      error: 'Enum not found',
      available: [
        ...Object.keys(lookupTableMap),
        ...Object.keys(this.staticEnums),
      ],
    };
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
