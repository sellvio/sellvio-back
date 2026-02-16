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

@Injectable()
export class CampaignsService {
  // Cache for lookup table IDs
  private lookupCache: {
    campaignStatuses?: Map<string, number>;
    participationStatuses?: Map<string, number>;
    paymentTypes?: Map<string, number>;
    creatorTypes?: Map<string, number>;
    chatRoleTypes?: Map<string, number>;
    userTypes?: Map<string, number>;
    videoStatuses?: Map<string, number>;
  } = {};

  constructor(private prisma: PrismaService) {}

  // Helper methods to get IDs from lookup tables
  private async getCampaignStatusId(status: string): Promise<number | null> {
    if (!this.lookupCache.campaignStatuses) {
      const statuses = await this.prisma.campaign_statuses.findMany();
      this.lookupCache.campaignStatuses = new Map(
        statuses.map((s) => [s.campaign_status, s.id]),
      );
    }
    return this.lookupCache.campaignStatuses.get(status) || null;
  }

  private async getParticipationStatusId(
    status: string,
  ): Promise<number | null> {
    if (!this.lookupCache.participationStatuses) {
      const statuses = await this.prisma.participation_statuses.findMany();
      this.lookupCache.participationStatuses = new Map(
        statuses.map((s) => [s.participation_status, s.id]),
      );
    }
    return this.lookupCache.participationStatuses.get(status) || null;
  }

  private async getPaymentTypeId(type: string): Promise<number | null> {
    if (!this.lookupCache.paymentTypes) {
      const types = await this.prisma.payment_types.findMany();
      this.lookupCache.paymentTypes = new Map(
        types.map((t) => [t.payment_type, t.id]),
      );
    }
    return this.lookupCache.paymentTypes.get(type) || null;
  }

  private async getCreatorTypeIds(types: string[]): Promise<number[]> {
    if (!this.lookupCache.creatorTypes) {
      const creatorTypes = await this.prisma.creator_types.findMany();
      this.lookupCache.creatorTypes = new Map(
        creatorTypes.map((t) => [t.creator_type, t.id]),
      );
    }
    return types
      .map((t) => this.lookupCache.creatorTypes!.get(t))
      .filter((id): id is number => id !== undefined);
  }

  private async getChatRoleTypeId(role: string): Promise<number | null> {
    if (!this.lookupCache.chatRoleTypes) {
      const roles = await this.prisma.chat_role_types.findMany();
      this.lookupCache.chatRoleTypes = new Map(
        roles.map((r) => [r.chat_role_type, r.id]),
      );
    }
    return this.lookupCache.chatRoleTypes.get(role) || null;
  }

  private async getUserTypeId(type: string): Promise<number> {
    if (!this.lookupCache.userTypes) {
      const types = await this.prisma.user_types.findMany();
      this.lookupCache.userTypes = new Map(
        types.map((t) => [t.user_type, t.id]),
      );
    }
    return this.lookupCache.userTypes.get(type) ?? 0;
  }

  private async getVideoStatusId(status: string): Promise<number | null> {
    if (!this.lookupCache.videoStatuses) {
      const statuses = await this.prisma.video_statuses.findMany();
      this.lookupCache.videoStatuses = new Map(
        statuses.map((s) => [s.video_status, s.id]),
      );
    }
    return this.lookupCache.videoStatuses.get(status) || null;
  }

  async searchCreatorsByName(
    q: string,
    pagination: { page: number; limit: number },
  ) {
    const search = String(q || '').trim();
    if (!search) {
      return {
        data: [],
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
      };
    }
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    // Tokenize search; require each token to be present in first or last name (case-insensitive)
    const tokens = search
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const andClauses =
      tokens.length > 0
        ? tokens.map((t) => ({
            OR: [
              { first_name: { contains: t, mode: 'insensitive' as const } },
              { last_name: { contains: t, mode: 'insensitive' as const } },
            ],
          }))
        : [];

    const creatorUserTypeId = await this.getUserTypeId('creator');

    const [rows, total] = await Promise.all([
      this.prisma.creator_profiles.findMany({
        where: {
          AND: andClauses,
          users: { user_type_id: creatorUserTypeId },
        },
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          profile_image_url: true,
          users: {
            select: {
              email: true,
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.creator_profiles.count({
        where: {
          AND: andClauses,
          users: { user_type_id: creatorUserTypeId },
        },
      }),
    ]);
    const data = rows.map((r) => ({
      id: r.user_id,
      email: r.users.email,
      first_name: r.first_name,
      last_name: r.last_name,
      profile_image_url: r.profile_image_url,
    }));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

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

    // Look up IDs from lookup tables
    const statusId = campaignData.status
      ? await this.getCampaignStatusId(campaignData.status)
      : await this.getCampaignStatusId('draft');
    const paymentTypeId = campaignData.payment_type
      ? await this.getPaymentTypeId(campaignData.payment_type)
      : null;
    const creatorTypeIds = campaignData.target_creator_types
      ? await this.getCreatorTypeIds(campaignData.target_creator_types)
      : [];

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
          // Set the new ID fields
          status_id: statusId,
          payment_type_id: paymentTypeId,
          target_creator_types_id: creatorTypeIds,
          chat_type_new: campaignData.chat_type || 'public',
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

    const where: any = {};

    if (filters?.status) {
      const statusId = await this.getCampaignStatusId(filters.status);
      if (statusId) {
        where.status_id = statusId;
      }
    }

    if (filters?.business_id) {
      where.business_id = filters.business_id;
    }

    // Filter by creator types (campaigns that target any of the specified creator types)
    if (filters?.creator_types && filters.creator_types.length > 0) {
      const creatorTypeIds = await this.getCreatorTypeIds(
        filters.creator_types,
      );
      where.target_creator_types_id = {
        hasSome: creatorTypeIds,
      };
    }

    // Filter by platforms (campaigns that have any of the specified platforms)
    if (filters?.platforms && filters.platforms.length > 0) {
      where.campaign_platforms = {
        some: {
          platform: { in: filters.platforms },
        },
      };
    }

    // Filter by tags (campaigns that have any of the specified tags)
    if (filters?.tags && filters.tags.length > 0) {
      where.campaign_tags = {
        some: {
          tags: {
            name: { in: filters.tags },
          },
        },
      };
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
    const approvedVideoStatusId = await this.getVideoStatusId('approved');

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
            status_id: approvedVideoStatusId,
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const serverMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: server.id, user_id: userId },
      },
      select: { role_id: true },
    });
    const isAdmin =
      serverMembership?.role_id === adminRoleId ||
      campaign.business_id === userId;

    if (!isAdmin) {
      // Ensure user is campaign participant (approved) or at least a member of the server
      const approvedStatusId = await this.getParticipationStatusId('approved');
      const participation = await this.prisma.campaign_participants.findUnique({
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: userId,
          },
        },
        select: { status_id: true },
      });
      const isApprovedParticipant =
        participation?.status_id === approvedStatusId;
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

    const activeCampaignStatusId = await this.getCampaignStatusId('active');
    if (campaign.status_id === activeCampaignStatusId) {
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
    const creatorUserTypeId = await this.getUserTypeId('creator');
    const user = await this.prisma.users.findUnique({
      where: { id: creatorId },
      include: { creator_profiles: true },
    });

    if (!user || user.user_type_id !== creatorUserTypeId) {
      throw new ForbiddenException(
        'Only creators can participate in campaigns',
      );
    }

    // Check if campaign exists and is active
    const activeCampaignStatusId = await this.getCampaignStatusId('active');
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status_id: true,
        business_id: true,
        chat_type: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status_id !== activeCampaignStatusId) {
      throw new BadRequestException('Campaign is not accepting participants');
    }

    // Check if already participating
    const pendingStatusId = await this.getParticipationStatusId('pending');
    const approvedStatusId = await this.getParticipationStatusId('approved');
    const rejectedStatusId = await this.getParticipationStatusId('rejected');

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
      if (existingParticipation.status_id === pendingStatusId) {
        throw new BadRequestException(
          'Your participation request is already pending approval',
        );
      }
      if (existingParticipation.status_id === approvedStatusId) {
        throw new BadRequestException(
          'You are already participating in this campaign',
        );
      }
      if (existingParticipation.status_id === rejectedStatusId) {
        throw new BadRequestException(
          'Your participation request was previously rejected',
        );
      }
    }

    // For public campaigns, auto-approve; for private, create pending request
    const isPublic = String(campaign.chat_type || 'public') === 'public';
    const participationStatusValue = isPublic ? 'approved' : 'pending';
    const participationStatusId = await this.getParticipationStatusId(
      participationStatusValue,
    );
    const chatRoleId = await this.getChatRoleTypeId('user');

    const participation = await this.prisma.campaign_participants.create({
      data: {
        campaign_id: campaignId,
        creator_id: creatorId,
        status_id: participationStatusId,
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
            role_id: chatRoleId,
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
    status: string,
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

    // Get the status_id from lookup table
    const statusId = await this.getParticipationStatusId(status);
    const approvedStatusId = await this.getParticipationStatusId('approved');
    const rejectedStatusId = await this.getParticipationStatusId('rejected');

    const updatedParticipation = await this.prisma.campaign_participants.update(
      {
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: creatorId,
          },
        },
        data: {
          status_id: statusId,
          approved_at: statusId === approvedStatusId ? new Date() : null,
          approved_by: statusId === approvedStatusId ? businessId : null,
          rejection_reason:
            statusId === rejectedStatusId ? rejectionReason : null,
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
    if (statusId === approvedStatusId) {
      const chatRoleId = await this.getChatRoleTypeId('user');
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
            role_id: chatRoleId,
            user_id: creatorId,
          },
        });
      }
    }

    return updatedParticipation;
  }

  async listParticipationRequests(
    campaignId: number,
    businessId: number,
    status?: string,
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
      const statusId = await this.getParticipationStatusId(status);
      if (statusId) {
        where.status_id = statusId;
      }
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

  async updateChatServer(
    campaignId: number,
    userId: number,
    data: { name?: string; description?: string },
  ) {
    // Verify campaign exists and user is the owner
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { id: true, business_id: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.business_id !== userId) {
      throw new ForbiddenException(
        'You can only update chat servers for your own campaigns',
      );
    }

    // Find the chat server for this campaign
    const server = await this.prisma.chat_servers.findFirst({
      where: { campaign_id: campaignId },
    });

    if (!server) {
      throw new NotFoundException('Chat server not found for this campaign');
    }

    // Update the chat server
    const updateData: { name?: string; description?: string } = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    const updatedServer = await this.prisma.chat_servers.update({
      where: { id: server.id },
      data: updateData,
      select: {
        id: true,
        campaign_id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });

    return updatedServer;
  }

  // ===== Favorite Creators Methods =====

  async addCreatorToFavorites(businessId: number, creatorId: number) {
    // Verify user is a creator
    const creatorUserTypeId = await this.getUserTypeId('creator');
    const creator = await this.prisma.users.findUnique({
      where: { id: creatorId },
      select: { id: true, user_type_id: true },
    });

    if (!creator || creator.user_type_id !== creatorUserTypeId) {
      throw new BadRequestException('User is not a creator');
    }

    // Check if already favorited
    const existing = await this.prisma.business_favorites.findUnique({
      where: {
        business_id_creator_id: {
          business_id: businessId,
          creator_id: creatorId,
        },
      },
    });

    if (existing) {
      return { message: 'Creator is already in favorites', favorite: existing };
    }

    const favorite = await this.prisma.business_favorites.create({
      data: {
        business_id: businessId,
        creator_id: creatorId,
      },
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
    });

    return { message: 'Creator added to favorites', favorite };
  }

  async removeCreatorFromFavorites(businessId: number, creatorId: number) {
    const existing = await this.prisma.business_favorites.findUnique({
      where: {
        business_id_creator_id: {
          business_id: businessId,
          creator_id: creatorId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Creator is not in favorites');
    }

    await this.prisma.business_favorites.delete({
      where: {
        business_id_creator_id: {
          business_id: businessId,
          creator_id: creatorId,
        },
      },
    });

    return { message: 'Creator removed from favorites' };
  }

  async searchCreators(
    businessId: number,
    q: string,
    pagination: { page: number; limit: number },
    filters: {
      favoritesOnly?: boolean;
      creatorTypes?: string[];
      platforms?: string[];
      tags?: string[];
    } = {},
  ) {
    const search = String(q || '').trim();
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build search conditions
    const tokens = search
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const searchClauses =
      tokens.length > 0
        ? tokens.map((t) => ({
            OR: [
              { first_name: { contains: t, mode: 'insensitive' as const } },
              { last_name: { contains: t, mode: 'insensitive' as const } },
            ],
          }))
        : [];

    const creatorUserTypeId = await this.getUserTypeId('creator');

    const baseWhere: any = {
      users: { user_type_id: creatorUserTypeId },
    };

    if (searchClauses.length > 0) {
      baseWhere.AND = searchClauses;
    }

    // Filter by favorites only
    if (filters.favoritesOnly) {
      baseWhere.business_favorites = {
        some: {
          business_id: businessId,
        },
      };
    }

    // Filter by creator types
    if (filters.creatorTypes && filters.creatorTypes.length > 0) {
      const creatorTypeIds = await this.getCreatorTypeIds(filters.creatorTypes);
      console.log(creatorTypeIds);
      baseWhere.creator_type_id = { in: creatorTypeIds };
    }

    // Filter by platforms (creators who have connected these platforms)
    if (filters.platforms && filters.platforms.length > 0) {
      baseWhere.social_media_accounts = {
        some: {
          platform: { in: filters.platforms },
          is_connected: true,
        },
      };
    }

    // Filter by tags (creators who have any of these tags)
    if (filters.tags && filters.tags.length > 0) {
      baseWhere.creator_tags = {
        some: {
          tags: {
            name: { in: filters.tags },
          },
        },
      };
    }

    // Get favorite creator IDs for this business to mark them in results
    const favoriteIds = new Set(
      (
        await this.prisma.business_favorites.findMany({
          where: { business_id: businessId },
          select: { creator_id: true },
        })
      ).map((f) => f.creator_id),
    );

    const [rows, total] = await Promise.all([
      this.prisma.creator_profiles.findMany({
        where: baseWhere,
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          nickname: true,
          profile_image_url: true,
          creator_type_id: true,
          users: {
            select: {
              email: true,
            },
          },
          social_media_accounts: {
            where: { is_connected: true },
            select: {
              platform: true,
            },
          },
          creator_tags: {
            select: {
              tags: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.creator_profiles.count({
        where: baseWhere,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.user_id,
      email: r.users.email,
      first_name: r.first_name,
      last_name: r.last_name,
      nickname: r.nickname,
      profile_image_url: r.profile_image_url,
      creator_type_id: r.creator_type_id,
      platforms: r.social_media_accounts.map((s) => s.platform),
      tags: r.creator_tags.map((t) => t.tags.name),
      is_favorite: favoriteIds.has(r.user_id),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }
}
