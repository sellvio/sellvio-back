import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  channel_type,
  chat_role_type,
  user_type,
  participation_status,
} from '@prisma/client';

@Injectable()
export class ChatChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listVisible(serverId: number, userId: number) {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true, campaign_id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');

    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: server.campaign_id },
      select: { business_id: true },
    });
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: serverId, user_id: userId },
      },
      select: { role: true },
    });
    const isAdmin =
      membership?.role === 'admin' || campaign?.business_id === userId;
    if (isAdmin) {
      return this.prisma.chat_channels.findMany({
        where: { chat_servers_id: serverId },
        orderBy: { id: 'asc' },
      });
    }

    const participant = await this.prisma.campaign_participants.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: server.campaign_id,
          creator_id: userId,
        },
      },
      select: { status: true },
    });
    const isApprovedParticipant = participant?.status === 'approved';
    const isServerMember = !!membership;
    if (!isApprovedParticipant && !isServerMember) {
      throw new NotFoundException('Chat server not found');
    }

    const allChannels = (await this.prisma.chat_channels.findMany({
      where: { chat_servers_id: serverId },
      orderBy: { id: 'asc' },
    })) as any[];
    const privateIds = allChannels
      .filter((c) => String(c.channel_state || 'public') === 'private')
      .map((c) => c.id as number);
    let allowedPrivateIds: number[] = [];
    if (privateIds.length > 0) {
      const rows = await this.prisma.$queryRaw<{ channel_id: number }[]>`
          SELECT cm.channel_id
          FROM public.channel_memberships cm
          WHERE cm.user_id = ${userId}
            AND cm.channel_id = ANY(${privateIds})
        `;
      allowedPrivateIds = rows.map((r) => r.channel_id);
    }
    return allChannels.filter((c) => {
      const isPrivate = String(c.channel_state || 'public') === 'private';
      console.log(
        'isPrivate',
        isPrivate,
        c.id,
        allowedPrivateIds.includes(c.id as number),
      );
      return !isPrivate || allowedPrivateIds.includes(c.id as number);
    });
  }

  async create(
    serverId: number,
    data: {
      name: string;
      // channel_type is ignored; always set to 'other'
      description?: string | null;
      channel_state?: string | null;
      member_user_ids?: number[];
    },
    addedByUserId: number,
  ) {
    // Ensure server exists
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');

    const channelState = data.channel_state || undefined;
    const created = await this.prisma.chat_channels.create({
      data: {
        chat_servers_id: serverId,
        name: data.name,
        // Force default channel type to 'other' regardless of input
        channel_type: channel_type.other,
        description: data.description ?? null,
      },
    });
    if (channelState) {
      await this.prisma.$executeRaw`
        UPDATE public.chat_channels
        SET channel_state = ${channelState}
        WHERE id = ${created.id}
      `;
      // proceed to post-create actions after fetching persisted state
      await this.prisma.chat_channels.findUnique({
        where: { id: created.id },
      });
    }
    // Optionally add members (creators) during creation
    if (data.member_user_ids && data.member_user_ids.length > 0) {
      // Reuse existing validation logic via addMembers
      try {
        await this.addMembers(
          serverId,
          created.id,
          data.member_user_ids,
          addedByUserId,
        );
      } catch (e) {
        // If adding members fails, we still return the created channel;
        // caller can inspect errors by calling addMembers separately.
      }
    }
    return this.prisma.chat_channels.findUnique({ where: { id: created.id } });
  }

  async update(
    serverId: number,
    channelId: number,
    data: {
      name?: string;
      description?: string | null;
      channel_state?: string | null;
    },
  ) {
    const existing = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { chat_servers_id: true },
    });
    if (!existing || existing.chat_servers_id !== serverId) {
      throw new NotFoundException('Channel not found in this server');
    }
    return this.prisma.chat_channels.update({
      where: { id: channelId },
      data: {
        name: data.name,
        description: data.description,
        channel_state: data.channel_state,
      },
    });
  }

  async addMember(
    serverId: number,
    channelId: number,
    creatorUserId: number,
    addedByUserId: number,
  ) {
    // Validate channel belongs to server
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { id: true, chat_servers_id: true },
    });
    if (!channel || channel.chat_servers_id !== serverId) {
      throw new NotFoundException('Channel not found in this server');
    }
    // Resolve campaign
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { campaign_id: true },
    });
    if (!server) {
      throw new NotFoundException('Chat server not found');
    }
    // Validate user is a creator
    const user = await this.prisma.users.findUnique({
      where: { id: creatorUserId },
      select: { id: true, user_type: true },
    });
    if (!user || user.user_type !== user_type.creator) {
      throw new BadRequestException('Only creators can be added to channels');
    }
    // Validate approved participation in campaign
    const participation = await this.prisma.campaign_participants.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: server.campaign_id,
          creator_id: creatorUserId,
        },
      },
      select: { status: true },
    });
    if (
      !participation ||
      participation.status !== participation_status.approved
    ) {
      throw new BadRequestException(
        'Creator must be an approved participant of the campaign',
      );
    }
    // Check existing channel membership
    const existing = await this.prisma.channel_memberships.findUnique({
      where: {
        channel_id_user_id: { channel_id: channelId, user_id: creatorUserId },
      },
      select: { id: true },
    });
    if (existing) {
      return {
        success: true,
        message: 'User is already a member of this channel',
      };
    }
    // Add member with role user
    await this.prisma.channel_memberships.create({
      data: {
        channel_id: channelId,
        user_id: creatorUserId,
        role: chat_role_type.user,
        added_by: addedByUserId,
      },
    });
    return { success: true };
  }

  async addMembers(
    serverId: number,
    channelId: number,
    creatorUserIds: number[],
    addedByUserId: number,
  ) {
    // Validate channel belongs to server
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { id: true, chat_servers_id: true },
    });
    if (!channel || channel.chat_servers_id !== serverId) {
      throw new NotFoundException('Channel not found in this server');
    }
    // Resolve campaign
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { campaign_id: true },
    });
    if (!server) {
      throw new NotFoundException('Chat server not found');
    }
    const uniqueIds = Array.from(new Set(creatorUserIds));
    if (uniqueIds.length === 0) return { added: 0, skipped: [], errors: [] };

    // Fetch users that are creators
    const users = await this.prisma.users.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, user_type: true },
    });
    const creatorIds = new Set(
      users.filter((u) => u.user_type === user_type.creator).map((u) => u.id),
    );

    // Fetch approved participants for campaign
    const participations = await this.prisma.campaign_participants.findMany({
      where: {
        campaign_id: server.campaign_id,
        creator_id: { in: Array.from(creatorIds) },
        status: participation_status.approved,
      },
      select: { creator_id: true },
    });
    const approvedCreatorIds = new Set(participations.map((p) => p.creator_id));

    // Remove those not creators or not approved participants
    const eligible = uniqueIds.filter(
      (id) => creatorIds.has(id) && approvedCreatorIds.has(id),
    );
    const notEligible = uniqueIds.filter((id) => !eligible.includes(id));

    if (eligible.length === 0) {
      return { added: 0, skipped: notEligible, errors: [] };
    }

    // Filter out already channel members
    const existing = await this.prisma.channel_memberships.findMany({
      where: {
        channel_id: channelId,
        user_id: { in: eligible },
      },
      select: { user_id: true },
    });
    const alreadyMembers = new Set(existing.map((e) => e.user_id));
    const toInsert = eligible.filter((id) => !alreadyMembers.has(id));

    if (toInsert.length > 0) {
      await this.prisma.channel_memberships.createMany({
        data: toInsert.map((uid) => ({
          channel_id: channelId,
          user_id: uid,
          role: chat_role_type.user,
          added_by: addedByUserId,
        })),
        skipDuplicates: true,
      });
    }

    return {
      added: toInsert.length,
      skipped: [...notEligible, ...Array.from(alreadyMembers)],
      errors: [],
    };
  }

  async listServerMembers(serverId: number, requesterId: number) {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { id: true, campaign_id: true },
    });
    if (!server) throw new NotFoundException('Chat server not found');
    // requester must be server member or campaign owner
    const [membership, campaign] = await Promise.all([
      this.prisma.chat_memberships.findUnique({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: requesterId,
          },
        },
        select: { role: true },
      }),
      this.prisma.campaigns.findUnique({
        where: { id: server.campaign_id },
        select: { business_id: true },
      }),
    ]);
    const isOwner = campaign?.business_id === requesterId;
    if (!membership && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to view server members',
      );
    }
    const memberships = await this.prisma.chat_memberships.findMany({
      where: { chat_server_id: serverId },
      orderBy: { joined_at: 'asc' },
      select: {
        user_id: true,
        role: true,
        joined_at: true,
      },
    });
    const userIds = memberships.map((m) => m.user_id);
    const users =
      userIds.length > 0
        ? await this.prisma.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, user_type: true },
          })
        : [];
    const idToUser = new Map(users.map((u) => [u.id, u]));
    return memberships.map((m) => ({
      user: idToUser.get(m.user_id) || { id: m.user_id },
      role: m.role,
      joined_at: m.joined_at,
    }));
  }

  async listChannelUsers(
    serverId: number,
    channelId: number,
    requesterId: number,
  ) {
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { id: true, chat_servers_id: true },
    });
    if (!channel || channel.chat_servers_id !== serverId) {
      throw new NotFoundException('Channel not found in this server');
    }
    // Determine channel_state via SQL (column not mapped in Prisma schema)
    const rows = await this.prisma.$queryRaw<{ channel_state: string }[]>`
        SELECT channel_state
        FROM public.chat_channels
        WHERE id = ${channelId}
        LIMIT 1
      `;
    const channelState = rows[0]?.channel_state || 'public';
    // Load membership and owner for checks
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { campaign_id: true },
    });
    const [serverMembership, campaign] = await Promise.all([
      this.prisma.chat_memberships.findUnique({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: requesterId,
          },
        },
        select: { role: true },
      }),
      this.prisma.campaigns.findUnique({
        where: { id: server?.campaign_id || 0 },
        select: { business_id: true },
      }),
    ]);
    const isOwner = campaign?.business_id === requesterId;
    if (channelState === 'private') {
      // must be channel member or server admin or owner
      const cm = await this.prisma.channel_memberships.findUnique({
        where: {
          channel_id_user_id: { channel_id: channelId, user_id: requesterId },
        },
        select: { user_id: true },
      });
      const isServerAdmin = serverMembership?.role === chat_role_type.admin;
      if (!cm && !isServerAdmin && !isOwner) {
        throw new ForbiddenException(
          'You are not allowed to view this channel users',
        );
      }
      const cms = await this.prisma.channel_memberships.findMany({
        where: { channel_id: channelId },
        select: { user_id: true, role: true, added_at: true },
        orderBy: { added_at: 'asc' },
      });
      // Also include server admins (access to all channels)
      const adminMemberships = await this.prisma.chat_memberships.findMany({
        where: { chat_server_id: serverId, role: chat_role_type.admin },
        select: { user_id: true, role: true, joined_at: true },
        orderBy: { joined_at: 'asc' },
      });
      const channelMemberIds = new Set(cms.map((m) => m.user_id));
      const adminOnly = adminMemberships.filter(
        (m) => !channelMemberIds.has(m.user_id),
      );
      const unionIds = Array.from(
        new Set([
          ...cms.map((m) => m.user_id),
          ...adminOnly.map((m) => m.user_id),
        ]),
      );
      const users =
        unionIds.length > 0
          ? await this.prisma.users.findMany({
              where: { id: { in: unionIds } },
              select: { id: true, email: true, user_type: true },
            })
          : [];
      const idToUser = new Map(users.map((u) => [u.id, u]));
      const channelResults = cms.map((m) => ({
        user: idToUser.get(m.user_id) || { id: m.user_id },
        role: m.role,
        joined_at: m.added_at,
      }));
      const adminResults = adminOnly.map((m) => ({
        user: idToUser.get(m.user_id) || { id: m.user_id },
        role: m.role,
        joined_at: m.joined_at,
      }));
      return [...channelResults, ...adminResults];
    }
    // Public channel: server members and owner can see it
    if (!serverMembership && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to view this channel users',
      );
    }
    return this.listServerMembers(serverId, requesterId);
  }

  async remove(serverId: number, channelId: number) {
    const existing = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { chat_servers_id: true },
    });
    if (!existing || existing.chat_servers_id !== serverId) {
      throw new NotFoundException('Channel not found in this server');
    }
    await this.prisma.chat_channels.delete({ where: { id: channelId } });
    return { success: true };
  }
}
