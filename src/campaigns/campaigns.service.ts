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
  chat_role_type,
} from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(
    businessId: number,
    createCampaignDto: CreateCampaignDto,
  ): Promise<any> {
    const { platforms, tags, media, uploaded_assets, ...rest } =
      createCampaignDto as any;
    const uploadedAssets = uploaded_assets as
      | { name: string; url: string; type: string }[]
      | undefined;
    const campaignData = { ...rest } as any;

    // // Verify user is a business
    // const user = await this.prisma.users.findUnique({
    //   where: { id: businessId },
    //   include: { business_profiles: true },
    // });

    // if (!user || user.user_type !== user_type.business) {
    //   throw new ForbiddenException('Only business users can create campaigns');
    // }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create campaign
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (campaignData.duration_days || 0));
      const campaign = await tx.campaigns.create({
        data: {
          business_id: businessId,
          ...campaignData,
          start_date: startDate,
          end_date: endDate,
          finish_date: endDate,
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

      // Add media assets (links from DTO)
      const linkAssets =
        (media || []).map((m) => ({
          campaign_id: campaign.id,
          asset_name: m.name,
          asset_url: m.url,
          asset_type: 'link',
        })) || [];

      // Add uploaded assets (files via Cloudinary)
      const fileAssets =
        (uploadedAssets || []).map((m) => ({
          campaign_id: campaign.id,
          asset_name: m.name,
          asset_url: m.url,
          asset_type: m.type, // extension like 'jpg','png','mp4'
          file_size:
            (m as any).size !== undefined
              ? BigInt(Number((m as any).size))
              : undefined,
        })) || [];

      if (linkAssets.length + fileAssets.length > 0) {
        await tx.campaign_assets.createMany({
          data: [...linkAssets, ...fileAssets],
        });
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
    console.log(filters);

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
        campaign_assets: {
          select: {
            asset_name: true,
            asset_url: true,
            asset_type: true,
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

  async getChatServerByCampaign(campaignId: number, userId: number) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { id: true, business_id: true },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const server = await this.prisma.chat_servers.findFirst({
      where: { campaign_id: campaignId },
      select: {
        id: true,
        campaign_id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });
    if (!server) {
      throw new NotFoundException('Chat server not found for this campaign');
    }

    // Determine access level
    const serverMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: server.id, user_id: userId },
      },
      select: { role: true },
    });
    const isAdmin =
      serverMembership?.role === 'admin' || campaign.business_id === userId;

    if (!isAdmin) {
      // Ensure user is campaign participant (approved) or at least a member of the server
      const participation = await this.prisma.campaign_participants.findUnique({
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: userId,
          },
        },
        select: { status: true },
      });
      const isApprovedParticipant =
        participation?.status === participation_status.approved;
      const isServerMember = !!serverMembership;

      if (!isApprovedParticipant && !isServerMember) {
        throw new ForbiddenException(
          'You are not allowed to access this campaign chat server',
        );
      }
    }

    // Fetch channels based on visibility
    if (isAdmin) {
      const channels = await this.prisma.chat_channels.findMany({
        where: { chat_servers_id: server.id },
        orderBy: { id: 'asc' },
      });
      return { ...server, chat_channels: channels };
    } else {
      // Non-admin: show public channels and private channels where the user has channel membership
      // 1) Get all channels for the server
      const allChannels = (await this.prisma.chat_channels.findMany({
        where: { chat_servers_id: server.id },
        orderBy: { id: 'asc' },
      })) as any[];
      // 2) Collect private channel IDs
      const privateChannelIds = allChannels
        .filter((c) => String(c.channel_state || 'public') === 'private')
        .map((c) => c.id as number);
      // 3) Find which private channels the user is member of (raw to avoid client mismatch)
      const rows = await this.prisma.$queryRaw<{ channel_id: number }[]>`
          SELECT cm.channel_id
          FROM public.channel_memberships cm
          JOIN public.chat_channels cc ON cc.id = cm.channel_id
          WHERE cm.user_id = ${userId}
            AND cc.chat_servers_id = ${server.id}
            AND COALESCE(cc.channel_state, 'public') = 'private'
        `;
      const allowedPrivateIds = new Set<number>(rows.map((r) => r.channel_id));
      // 4) Filter visible channels: all public + allowed private
      const visible = allChannels.filter((c) => {
        const isPrivate = String(c.channel_state || 'public') === 'private';
        return !isPrivate || allowedPrivateIds.has(c.id as number);
      });
      return { ...server, chat_channels: visible };
    }
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

    const { platforms, tags, ...rest } = updateCampaignDto as any;
    const campaignData: any = { ...rest };

    const result = await this.prisma.$transaction(async (tx) => {
      let updatedCampaign = await tx.campaigns.update({
        where: { id },
        data: campaignData,
      });

      // Recompute end_date and finish_date when duration_days changes
      if (campaignData.duration_days !== undefined) {
        const currentStart = updatedCampaign.start_date
          ? new Date(updatedCampaign.start_date)
          : new Date();
        const newEnd = new Date(currentStart);
        newEnd.setDate(newEnd.getDate() + campaignData.duration_days);
        updatedCampaign = await tx.campaigns.update({
          where: { id },
          data: { end_date: newEnd, finish_date: newEnd },
        });
      }

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

    await this.prisma.$transaction(async (tx) => {
      // Remove dependent records that don't cascade
      await tx.campaign_budget_tracking.deleteMany({
        where: { campaign_id: id },
      });
      // Remove chat server tree (servers -> channels, memberships cascade on server delete)
      await tx.chat_servers.deleteMany({ where: { campaign_id: id } });

      // Optional cleanup (most of these have onDelete: Cascade, but safe to clear explicitly)
      await tx.campaign_platforms.deleteMany({ where: { campaign_id: id } });
      await tx.campaign_tags.deleteMany({ where: { campaign_id: id } });
      await tx.campaign_assets.deleteMany({ where: { campaign_id: id } });
      await tx.campaign_analytics.deleteMany({ where: { campaign_id: id } });
      await tx.campaign_participants.deleteMany({ where: { campaign_id: id } });
      await tx.campaign_videos.deleteMany({ where: { campaign_id: id } });

      // Finally delete the campaign
      await tx.campaigns.delete({ where: { id } });
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
      select: {
        id: true,
        status: true,
        business_id: true,
        chat_type: true,
      },
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
      if (existingParticipation.status === participation_status.pending) {
        throw new BadRequestException(
          'Your participation request is already pending approval',
        );
      }
      if (existingParticipation.status === participation_status.approved) {
        throw new BadRequestException(
          'You are already participating in this campaign',
        );
      }
      if (existingParticipation.status === participation_status.rejected) {
        throw new BadRequestException(
          'Your participation request was previously rejected',
        );
      }
    }

    // For public campaigns, auto-approve; for private, create pending request
    const isPublic = String(campaign.chat_type || 'public') === 'public';
    const participation = await this.prisma.campaign_participants.create({
      data: {
        campaign_id: campaignId,
        creator_id: creatorId,
        status: isPublic
          ? participation_status.approved
          : participation_status.pending,
        approved_at: isPublic ? new Date() : null,
        approved_by: isPublic ? campaign.business_id : null,
      },
      include: {
        campaigns: {
          select: {
            name: true,
          },
        },
      },
    });

    // If auto-approved (public), ensure server membership exists
    if (isPublic) {
      const server = await this.prisma.chat_servers.findFirst({
        where: { campaign_id: campaignId },
        select: { id: true },
      });
      if (server) {
        await this.prisma.chat_memberships.upsert({
          where: {
            chat_server_id_user_id: {
              chat_server_id: server.id,
              user_id: creatorId,
            },
          },
          update: {},
          create: {
            chat_server_id: server.id,
            user_id: creatorId,
            role: chat_role_type.user,
          },
        });
      }
    }

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

    // If approved now, ensure server membership exists
    if (status === participation_status.approved) {
      const server = await this.prisma.chat_servers.findFirst({
        where: { campaign_id: campaignId },
        select: { id: true },
      });
      if (server) {
        await this.prisma.chat_memberships.upsert({
          where: {
            chat_server_id_user_id: {
              chat_server_id: server.id,
              user_id: creatorId,
            },
          },
          update: {},
          create: {
            chat_server_id: server.id,
            user_id: creatorId,
            role: chat_role_type.user,
          },
        });
      }
    }

    return updatedParticipation;
  }

  async listParticipationRequests(
    campaignId: number,
    businessId: number,
    status?: participation_status,
  ) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { id: true, business_id: true },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.business_id !== businessId) {
      throw new ForbiddenException(
        'You can only view requests for your campaign',
      );
    }
    const where: any = { campaign_id: campaignId };
    if (status) {
      where.status = status;
    }
    return this.prisma.campaign_participants.findMany({
      where,
      orderBy: { applied_at: 'desc' },
      include: {
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            nickname: true,
            profile_image_url: true,
          },
        },
        users: {
          select: {
            email: true,
          },
        },
      },
    });
  }
}
