import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  user_type,
  campaign_status,
  participation_status,
} from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: number, createCampaignDto: CreateCampaignDto) {
    const { platforms, tags, ...campaignData } = createCampaignDto;

    // Verify user is a business
    const user = await this.prisma.users.findUnique({
      where: { id: businessId },
      include: { business_profiles: true },
    });

    if (!user || user.user_type !== user_type.business) {
      throw new ForbiddenException('Only business users can create campaigns');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create campaign
      const campaign = await tx.campaigns.create({
        data: {
          business_id: businessId,
          ...campaignData,
          start_date: new Date(),
        },
      });

      // Add platforms
      if (platforms && platforms.length > 0) {
        await tx.campaign_platforms.createMany({
          data: platforms.map((platform) => ({
            campaign_id: campaign.id,
            platform,
          })),
        });
      }

      // Add tags
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const tag = await tx.tags.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          await tx.campaign_tags.create({
            data: {
              campaign_id: campaign.id,
              tag_id: tag.id,
            },
          });
        }
      }

      // Create budget tracking
      await tx.campaign_budget_tracking.create({
        data: {
          campaign_id: campaign.id,
          total_budget: campaignData.budget,
          spent_amount: 0,
        },
      });

      return campaign;
    });

    return this.findOne(result.id);
  }

  async findAll(pagination: PaginationDto, filters?: any) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.business_id) {
      where.business_id = filters.business_id;
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaigns.findMany({
        where,
        skip,
        take: limit,
        include: {
          business_profiles: {
            select: {
              company_name: true,
              logo_url: true,
            },
          },
          campaign_platforms: {
            select: {
              platform: true,
            },
          },
          campaign_tags: {
            include: {
              tags: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              campaign_participants: true,
              campaign_videos: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.campaigns.count({ where }),
    ]);

    return {
      data: campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async findOne(id: number) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id },
      include: {
        business_profiles: {
          select: {
            company_name: true,
            logo_url: true,
            business_email: true,
          },
        },
        campaign_platforms: {
          select: {
            platform: true,
          },
        },
        campaign_tags: {
          include: {
            tags: {
              select: {
                name: true,
              },
            },
          },
        },
        campaign_budget_tracking: true,
        campaign_participants: {
          include: {
            creator_profiles: {
              select: {
                first_name: true,
                last_name: true,
                nickname: true,
                profile_image_url: true,
              },
            },
          },
        },
        campaign_videos: {
          where: {
            status: 'approved',
          },
          select: {
            id: true,
            title: true,
            cover_url: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            campaign_participants: true,
            campaign_videos: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(
    id: number,
    userId: number,
    updateCampaignDto: UpdateCampaignDto,
  ) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.business_id !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    const { platforms, tags, ...campaignData } = updateCampaignDto;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaigns.update({
        where: { id },
        data: campaignData,
      });

      // Update platforms if provided
      if (platforms !== undefined) {
        await tx.campaign_platforms.deleteMany({
          where: { campaign_id: id },
        });

        if (platforms.length > 0) {
          await tx.campaign_platforms.createMany({
            data: platforms.map((platform) => ({
              campaign_id: id,
              platform,
            })),
          });
        }
      }

      // Update tags if provided
      if (tags !== undefined) {
        await tx.campaign_tags.deleteMany({
          where: { campaign_id: id },
        });

        if (tags.length > 0) {
          for (const tagName of tags) {
            const tag = await tx.tags.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });

            await tx.campaign_tags.create({
              data: {
                campaign_id: id,
                tag_id: tag.id,
              },
            });
          }
        }
      }

      return updatedCampaign;
    });

    return this.findOne(id);
  }

  async remove(id: number, userId: number) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.business_id !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    if (campaign.status === campaign_status.active) {
      throw new BadRequestException('Cannot delete active campaigns');
    }

    await this.prisma.campaigns.delete({
      where: { id },
    });

    return { message: 'Campaign deleted successfully' };
  }

  async participate(campaignId: number, creatorId: number) {
    // Verify user is a creator
    const user = await this.prisma.users.findUnique({
      where: { id: creatorId },
      include: { creator_profiles: true },
    });

    if (!user || user.user_type !== user_type.creator) {
      throw new ForbiddenException(
        'Only creators can participate in campaigns',
      );
    }

    // Check if campaign exists and is active
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== campaign_status.active) {
      throw new BadRequestException('Campaign is not accepting participants');
    }

    // Check if already participating
    const existingParticipation =
      await this.prisma.campaign_participants.findUnique({
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: creatorId,
          },
        },
      });

    if (existingParticipation) {
      throw new BadRequestException('Already participating in this campaign');
    }

    const participation = await this.prisma.campaign_participants.create({
      data: {
        campaign_id: campaignId,
        creator_id: creatorId,
        status: participation_status.pending,
      },
      include: {
        campaigns: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      message: 'Successfully applied to participate in campaign',
      participation,
    };
  }

  async updateParticipationStatus(
    campaignId: number,
    creatorId: number,
    businessId: number,
    status: participation_status,
    rejectionReason?: string,
  ) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.business_id !== businessId) {
      throw new ForbiddenException('You can only manage your own campaigns');
    }

    const participation = await this.prisma.campaign_participants.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: campaignId,
          creator_id: creatorId,
        },
      },
    });

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    const updatedParticipation = await this.prisma.campaign_participants.update(
      {
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: creatorId,
          },
        },
        data: {
          status,
          approved_at:
            status === participation_status.approved ? new Date() : null,
          approved_by:
            status === participation_status.approved ? businessId : null,
          rejection_reason:
            status === participation_status.rejected ? rejectionReason : null,
        },
        include: {
          creator_profiles: {
            select: {
              first_name: true,
              last_name: true,
              nickname: true,
            },
          },
        },
      },
    );

    return updatedParticipation;
  }
}
