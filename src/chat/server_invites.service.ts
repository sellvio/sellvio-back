import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  chat_role_type,
  invite_status,
  participation_status,
  user_type,
} from '@prisma/client';

@Injectable()
export class ServerInvitesService {
  private lookupCache: {
    chatRoleTypes?: Map<string, number>;
    participationStatuses?: Map<string, number>;
  } = {};

  constructor(private readonly prisma: PrismaService) {}

  private async getChatRoleTypeId(role: string): Promise<number | null> {
    if (!this.lookupCache.chatRoleTypes) {
      const roles = await this.prisma.chat_role_types.findMany();
      this.lookupCache.chatRoleTypes = new Map(
        roles.map((r) => [r.chat_role_type, r.id]),
      );
    }
    return this.lookupCache.chatRoleTypes.get(role) || null;
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

  async createInvite(
    serverId: number,
    creatorUserId: number,
    invitedBy: number,
  ) {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true, campaign_id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');

    // Verify target user is a creator
    const user = await this.prisma.users.findUnique({
      where: { id: creatorUserId },
      select: { id: true, user_type: true },
    });
    if (!user || user.user_type !== user_type.creator) {
      throw new BadRequestException('Only creators can be invited to servers');
    }

    // Block if already a server member
    const existingMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: serverId,
          user_id: creatorUserId,
        },
      },
      select: { id: true },
    });
    if (existingMembership) {
      throw new BadRequestException(
        'User is already a member of this server',
      );
    }

    // Block if already an approved campaign participant
    const existingParticipation =
      await this.prisma.campaign_participants.findUnique({
        where: {
          campaign_id_creator_id: {
            campaign_id: server.campaign_id,
            creator_id: creatorUserId,
          },
        },
        select: { status: true },
      });
    if (existingParticipation?.status === participation_status.approved) {
      throw new BadRequestException(
        'User is already an approved participant of this campaign',
      );
    }

    // Check for existing invite
    const existingInvite = await this.prisma.server_invites.findUnique({
      where: {
        chat_server_id_invited_user_id: {
          chat_server_id: serverId,
          invited_user_id: creatorUserId,
        },
      },
    });

    if (existingInvite) {
      if (existingInvite.status === invite_status.pending) {
        return {
          success: true,
          message: 'Invite is already pending',
          invite: existingInvite,
        };
      }
      // Re-invite if previously declined
      if (existingInvite.status === invite_status.declined) {
        const updated = await this.prisma.server_invites.update({
          where: { id: existingInvite.id },
          data: {
            status: invite_status.pending,
            invited_by: invitedBy,
            responded_at: null,
            created_at: new Date(),
          },
        });
        return { success: true, invite: updated };
      }
      // Already accepted
      throw new BadRequestException('User has already accepted an invite to this server');
    }

    const invite = await this.prisma.server_invites.create({
      data: {
        chat_server_id: serverId,
        invited_user_id: creatorUserId,
        invited_by: invitedBy,
        status: invite_status.pending,
      },
    });

    return { success: true, invite };
  }

  async createInvites(
    serverId: number,
    creatorUserIds: number[],
    invitedBy: number,
  ) {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true, campaign_id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');

    const uniqueIds = Array.from(new Set(creatorUserIds));
    if (uniqueIds.length === 0) return { invited: 0, skipped: [] };

    // Fetch users that are creators
    const users = await this.prisma.users.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, user_type: true },
    });
    const creatorIds = new Set(
      users.filter((u) => u.user_type === user_type.creator).map((u) => u.id),
    );

    // Exclude existing server members
    const existingMembers = await this.prisma.chat_memberships.findMany({
      where: { chat_server_id: serverId, user_id: { in: Array.from(creatorIds) } },
      select: { user_id: true },
    });
    const memberIds = new Set(existingMembers.map((m) => m.user_id));

    // Exclude already approved participants
    const approvedParticipants =
      await this.prisma.campaign_participants.findMany({
        where: {
          campaign_id: server.campaign_id,
          creator_id: { in: Array.from(creatorIds) },
          status: participation_status.approved,
        },
        select: { creator_id: true },
      });
    const approvedIds = new Set(approvedParticipants.map((p) => p.creator_id));

    // Filter eligible
    const eligible = uniqueIds.filter(
      (id) => creatorIds.has(id) && !memberIds.has(id) && !approvedIds.has(id),
    );
    const skipped = uniqueIds.filter((id) => !eligible.includes(id));

    if (eligible.length === 0) return { invited: 0, skipped };

    // Check existing invites
    const existingInvites = await this.prisma.server_invites.findMany({
      where: {
        chat_server_id: serverId,
        invited_user_id: { in: eligible },
      },
      select: { id: true, invited_user_id: true, status: true },
    });

    const pendingInviteIds = new Set(
      existingInvites
        .filter((i) => i.status === invite_status.pending)
        .map((i) => i.invited_user_id),
    );
    const acceptedInviteIds = new Set(
      existingInvites
        .filter((i) => i.status === invite_status.accepted)
        .map((i) => i.invited_user_id),
    );
    const declinedInvites = existingInvites.filter(
      (i) => i.status === invite_status.declined,
    );

    // Re-invite declined ones
    if (declinedInvites.length > 0) {
      await this.prisma.server_invites.updateMany({
        where: { id: { in: declinedInvites.map((i) => i.id) } },
        data: {
          status: invite_status.pending,
          invited_by: invitedBy,
          responded_at: null,
          created_at: new Date(),
        },
      });
    }

    const declinedUserIds = new Set(
      declinedInvites.map((i) => i.invited_user_id),
    );

    // Create new invites for those without any existing invite
    const toCreate = eligible.filter(
      (id) =>
        !pendingInviteIds.has(id) &&
        !acceptedInviteIds.has(id) &&
        !declinedUserIds.has(id),
    );

    if (toCreate.length > 0) {
      await this.prisma.server_invites.createMany({
        data: toCreate.map((uid) => ({
          chat_server_id: serverId,
          invited_user_id: uid,
          invited_by: invitedBy,
          status: invite_status.pending,
        })),
        skipDuplicates: true,
      });
    }

    const totalInvited = toCreate.length + declinedInvites.length;
    const totalSkipped = [
      ...skipped,
      ...Array.from(pendingInviteIds),
      ...Array.from(acceptedInviteIds),
    ];

    return { invited: totalInvited, skipped: totalSkipped };
  }

  async listServerInvites(serverId: number, statusFilter?: string) {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');

    const where: any = { chat_server_id: serverId };
    if (
      statusFilter &&
      Object.values(invite_status).includes(statusFilter as invite_status)
    ) {
      where.status = statusFilter as invite_status;
    }

    const invites = await this.prisma.server_invites.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        invited_user_id: true,
        invited_by: true,
        status: true,
        created_at: true,
        responded_at: true,
      },
    });

    if (invites.length === 0) return [];

    const userIds = invites.map((i) => i.invited_user_id);
    const creatorProfiles = await this.prisma.creator_profiles.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        profile_image_url: true,
      },
    });
    const profileMap = new Map(
      creatorProfiles.map((p) => [p.user_id, p] as const),
    );

    return invites.map((i) => {
      const profile = profileMap.get(i.invited_user_id);
      return {
        ...i,
        creator: profile
          ? {
              user_id: profile.user_id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              profile_image_url: profile.profile_image_url,
            }
          : { user_id: i.invited_user_id },
      };
    });
  }

  async listMyInvites(userId: number) {
    const invites = await this.prisma.server_invites.findMany({
      where: {
        invited_user_id: userId,
        status: invite_status.pending,
      },
      orderBy: { created_at: 'desc' },
      include: {
        chat_servers: {
          select: {
            id: true,
            name: true,
            campaign_id: true,
            campaigns: {
              select: {
                id: true,
                name: true,
                business_id: true,
              },
            },
          },
        },
      },
    });

    if (invites.length === 0) return [];

    // Fetch inviter info
    const inviterIds = [...new Set(invites.map((i) => i.invited_by))];
    const businessIds = [
      ...new Set(invites.map((i) => i.chat_servers.campaigns.business_id)),
    ];
    const allProfileIds = [...new Set([...inviterIds, ...businessIds])];

    const [businessProfiles, creatorProfiles] = await Promise.all([
      this.prisma.business_profiles.findMany({
        where: { user_id: { in: allProfileIds } },
        select: { user_id: true, company_name: true, logo_url: true },
      }),
      this.prisma.creator_profiles.findMany({
        where: { user_id: { in: allProfileIds } },
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          profile_image_url: true,
        },
      }),
    ]);

    const businessProfileMap = new Map(
      businessProfiles.map((p) => [p.user_id, p] as const),
    );
    const creatorProfileMap = new Map(
      creatorProfiles.map((p) => [p.user_id, p] as const),
    );

    return invites.map((i) => {
      const businessProfile = businessProfileMap.get(
        i.chat_servers.campaigns.business_id,
      );
      const inviterBusiness = businessProfileMap.get(i.invited_by);
      const inviterCreator = creatorProfileMap.get(i.invited_by);

      return {
        id: i.id,
        status: i.status,
        created_at: i.created_at,
        server: {
          id: i.chat_servers.id,
          name: i.chat_servers.name,
        },
        campaign: {
          id: i.chat_servers.campaigns.id,
          name: i.chat_servers.campaigns.name,
          business: businessProfile
            ? {
                company_name: businessProfile.company_name,
                logo_url: businessProfile.logo_url,
              }
            : null,
        },
        invited_by: {
          user_id: i.invited_by,
          ...(inviterBusiness
            ? {
                company_name: inviterBusiness.company_name,
                logo_url: inviterBusiness.logo_url,
              }
            : {}),
          ...(inviterCreator
            ? {
                first_name: inviterCreator.first_name,
                last_name: inviterCreator.last_name,
                profile_image_url: inviterCreator.profile_image_url,
              }
            : {}),
        },
      };
    });
  }

  async respondToInvite(
    inviteId: number,
    userId: number,
    action: 'accepted' | 'declined',
  ) {
    const invite = await this.prisma.server_invites.findUnique({
      where: { id: inviteId },
      include: {
        chat_servers: {
          select: { id: true, campaign_id: true },
        },
      },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invited_user_id !== userId) {
      throw new ForbiddenException('This invite does not belong to you');
    }
    if (invite.status !== invite_status.pending) {
      throw new BadRequestException('This invite has already been responded to');
    }

    if (action === 'declined') {
      const updated = await this.prisma.server_invites.update({
        where: { id: inviteId },
        data: {
          status: invite_status.declined,
          responded_at: new Date(),
        },
      });
      return { success: true, status: updated.status };
    }

    // Accept: atomically join campaign + server
    const campaignId = invite.chat_servers.campaign_id;
    const serverId = invite.chat_servers.id;

    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { business_id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const [participationStatusId, chatRoleId] = await Promise.all([
      this.getParticipationStatusId('approved'),
      this.getChatRoleTypeId('user'),
    ]);

    await this.prisma.$transaction([
      // Update invite status
      this.prisma.server_invites.update({
        where: { id: inviteId },
        data: {
          status: invite_status.accepted,
          responded_at: new Date(),
        },
      }),
      // Upsert campaign participant (handles previously rejected/pending)
      this.prisma.campaign_participants.upsert({
        where: {
          campaign_id_creator_id: {
            campaign_id: campaignId,
            creator_id: userId,
          },
        },
        update: {
          status: participation_status.approved,
          status_id: participationStatusId,
          approved_at: new Date(),
          approved_by: campaign.business_id,
          rejection_reason: null,
        },
        create: {
          campaign_id: campaignId,
          creator_id: userId,
          status: participation_status.approved,
          status_id: participationStatusId,
          approved_at: new Date(),
          approved_by: campaign.business_id,
        },
      }),
      // Upsert chat membership
      this.prisma.chat_memberships.upsert({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: userId,
          },
        },
        update: {},
        create: {
          chat_server_id: serverId,
          user_id: userId,
          role: chat_role_type.user,
          role_id: chatRoleId,
        },
      }),
    ]);

    return { success: true, status: 'accepted' };
  }
}
