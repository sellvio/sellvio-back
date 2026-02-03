import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { chat_role_type } from '@prisma/client';

type WsUser = { id: number; email?: string; user_type?: string };

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  //Connections
  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers?.authorization as string | undefined)?.replace(
        /^Bearer\s+/i,
        '',
      );
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      const user: WsUser = {
        id: Number(payload.sub || payload.id) || 0,
        email: payload.email,
        user_type: payload.user_type,
      };
      if (!user.id) throw new UnauthorizedException('Invalid token');
      (client.data as any).user = user;
      client.emit('connected', { userId: user.id });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    // Update presence for any server rooms this client was in
    try {
      const rooms = Array.from(client.rooms || []);
      for (const room of rooms) {
        if (room.startsWith('server:')) {
          const serverId = Number(room.split(':')[1]);
          if (serverId > 0) {
            await this.broadcastServerOnline(serverId);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  //Server
  @SubscribeMessage('server:open')
  async onServerOpen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const serverId = Number(payload?.serverId);
    if (!serverId) {
      client.emit('error', { message: 'Invalid server id' });
      return;
    }
    const canView = await this.canViewServer(user.id, serverId);
    if (!canView) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    await client.join(this.serverRoomName(serverId));
    await this.broadcastServerOnline(serverId);
    await this.broadcastAllChannelsOnline(serverId);
  }

  @SubscribeMessage('server:close')
  async onServerClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number },
  ) {
    const serverId = Number(payload?.serverId);
    if (!serverId) return;
    await client.leave(this.serverRoomName(serverId));

    await this.broadcastServerOnline(serverId);
    await this.broadcastAllChannelsOnline(serverId);
  }

  @SubscribeMessage('server:leave')
  async onServerLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const serverId = Number(payload?.serverId);
    if (!serverId) {
      client.emit('error', { message: 'Invalid server id' });
      return;
    }
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: serverId, user_id: user.id },
      },
      select: { role: true },
    });
    if (!membership) {
      client.emit('error', { message: 'You are not a member of this server' });
      return;
    }
    if (membership.role === chat_role_type.admin) {
      client.emit('error', { message: 'Admins cannot leave the server' });
      return;
    }
    // Remove all channel memberships for this server and server membership
    const channels = await this.prisma.chat_channels.findMany({
      where: { chat_servers_id: serverId },
      select: { id: true },
    });
    const channelIds = channels.map((c) => c.id);
    await this.prisma.$transaction(async (tx) => {
      if (channelIds.length > 0) {
        await tx.channel_memberships.deleteMany({
          where: { channel_id: { in: channelIds }, user_id: user.id },
        });
      }
      await tx.chat_memberships.delete({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: user.id,
          },
        },
      });
    });
    // Leave rooms for this socket
    await client.leave(this.serverRoomName(serverId));
    for (const ch of channelIds) {
      await client.leave(this.channelRoomName(ch));
    }
    client.emit('server:left', { serverId });
    await this.broadcastServerOnline(serverId);
    await this.broadcastAllChannelsOnline(serverId);
  }

  @SubscribeMessage('server:kick')
  async onServerKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number; userId: number },
  ) {
    const requester: WsUser | undefined = (client.data as any).user;
    if (!requester?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const serverId = Number(payload?.serverId);
    const targetUserId = Number(payload?.userId);
    if (!serverId || !targetUserId) {
      client.emit('error', { message: 'Invalid server or user id' });
      return;
    }
    const requesterMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: serverId,
          user_id: requester.id,
        },
      },
      select: { role: true },
    });
    if (
      !requesterMembership ||
      requesterMembership.role !== chat_role_type.admin
    ) {
      client.emit('error', { message: 'Forbidden: admin only' });
      return;
    }
    const targetMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: serverId,
          user_id: targetUserId,
        },
      },
      select: { role: true },
    });
    if (!targetMembership) {
      client.emit('error', { message: 'User is not in this server' });
      return;
    }
    if (targetMembership.role === chat_role_type.admin) {
      client.emit('error', { message: 'Cannot kick another admin' });
      return;
    }
    const channels = await this.prisma.chat_channels.findMany({
      where: { chat_servers_id: serverId },
      select: { id: true },
    });
    const channelIds = channels.map((c) => c.id);
    await this.prisma.$transaction(async (tx) => {
      if (channelIds.length > 0) {
        await tx.channel_memberships.deleteMany({
          where: { channel_id: { in: channelIds }, user_id: targetUserId },
        });
      }
      await tx.chat_memberships.delete({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: targetUserId,
          },
        },
      });
    });
    // Remove target user's sockets from rooms if connected
    const sockets = await this.server
      .in(this.serverRoomName(serverId))
      .fetchSockets();
    for (const s of sockets) {
      const sUserId =
        (s.data && (s.data as any).user && (s.data as any).user.id) || 0;
      if (sUserId === targetUserId) {
        await s.leave(this.serverRoomName(serverId));
        for (const ch of channelIds) {
          await s.leave(this.channelRoomName(ch));
        }
        s.emit('server:kicked', { serverId });
      }
    }
    await this.broadcastServerOnline(serverId);
    await this.broadcastAllChannelsOnline(serverId);
    client.emit('server:kick:ok', { serverId, userId: targetUserId });
  }

  @SubscribeMessage('channel:open')
  async onChannelOpen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number; channelId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const serverId = Number(payload?.serverId);
    if (!serverId) {
      client.emit('error', { message: 'Invalid server id' });
      return;
    }
    const channelId = Number(payload?.channelId);
    if (!serverId || !channelId) {
      client.emit('error', { message: 'Invalid server or channel id' });
      return;
    }
    if (!channelId) {
      client.emit('error', { message: 'Invalid channel id' });
      return;
    }
    const canView = await this.canViewChannel(user.id, channelId);
    if (!canView) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    await client.join(this.channelRoomName(channelId));
    client.emit('joined', { channelId });
    await this.broadcastChannelOnline(serverId, channelId);
    // Send recent messages to the joining client (initial history)
    const limit = 50;
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        channel_id: number;
        sender_id: number;
        content: string;
        created_at: Date;
      }[]
    >`
      SELECT id, channel_id, sender_id, content, created_at
      FROM public.channel_messages
      WHERE channel_id = ${channelId}
      ORDER BY id DESC
      LIMIT ${limit}
    `;
    const mapped = rows
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
      }));
    const messages = await this.enrichMessagesWithSenderInfo(mapped);
    client.emit('message:history', {
      channelId,
      messages,
      nextBeforeId: rows.length > 0 ? rows[rows.length - 1].id : null,
      hasMore: rows.length === limit,
    });
  }
  @SubscribeMessage('channel:close')
  async onChannelClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: number; channelId: number },
  ) {
    const serverId = Number(payload?.serverId);
    const channelId = Number(payload?.channelId);
    if (!serverId || !channelId) return;
    await client.leave(this.channelRoomName(channelId));
    await this.broadcastChannelOnline(serverId, channelId);
    client.emit('left', { channelId });
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      content: string;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const content = String(payload?.content || '').trim();
    if (!channelId || !content) {
      client.emit('error', { message: 'Invalid message' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    // Persist message via SQL to avoid Prisma client type mismatch until generated
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        channel_id: number;
        sender_id: number;
        content: string;
        created_at: Date;
        pinned: boolean | null;
      }[]
    >`
      INSERT INTO public.channel_messages (channel_id, sender_id, content)
      VALUES (${channelId}, ${user.id}, ${content})
      RETURNING id, channel_id, sender_id, content, created_at, pinned
    `;
    const msg = rows[0];
    const [enriched] = await this.enrichMessagesWithSenderInfo([
      {
        id: msg.id,
        channelId: msg.channel_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: msg.created_at,
        pinned: !!msg.pinned,
      },
    ]);
    this.server.to(this.channelRoomName(channelId)).emit('message', enriched);
    client.emit('message:ack', { id: msg.id });
  }

  @SubscribeMessage('message:history')
  async onMessageHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      beforeId?: number;
      limit?: number;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const limit = Math.min(Math.max(Number(payload?.limit) || 50, 1), 200);
    const beforeId = payload?.beforeId ? Number(payload.beforeId) : undefined;
    if (!channelId) {
      client.emit('error', { message: 'Invalid channel id' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    const rows = beforeId
      ? await this.prisma.$queryRaw<
          {
            id: number;
            channel_id: number;
            sender_id: number;
            content: string;
            created_at: Date;
            pinned: boolean | null;
          }[]
        >`
          SELECT id, channel_id, sender_id, content, created_at, pinned
          FROM public.channel_messages
          WHERE channel_id = ${channelId} AND id < ${beforeId}
          ORDER BY id DESC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<
          {
            id: number;
            channel_id: number;
            sender_id: number;
            content: string;
            created_at: Date;
            pinned: boolean | null;
          }[]
        >`
          SELECT id, channel_id, sender_id, content, created_at, pinned
          FROM public.channel_messages
          WHERE channel_id = ${channelId}
          ORDER BY id DESC
          LIMIT ${limit}
        `;
    const mapped = rows
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        pinned: !!m.pinned,
      }));
    const messages = await this.enrichMessagesWithSenderInfo(mapped);
    client.emit('message:history', {
      channelId,
      messages,
      nextBeforeId: rows.length > 0 ? rows[rows.length - 1].id : null,
      hasMore: rows.length === limit,
    });
  }

  @SubscribeMessage('message:pin')
  async onMessagePin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      messageId: number;
      pinned: boolean; // true to pin, false to unpin
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const messageId = Number(payload?.messageId);
    const pinned = Boolean(payload?.pinned);
    if (!channelId || !messageId) {
      client.emit('error', { message: 'Invalid channel or message id' });
      return;
    }
    // Load channel -> server
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { chat_servers_id: true },
    });
    if (!channel) {
      client.emit('error', { message: 'Channel not found' });
      return;
    }
    // Check admin on server
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: channel.chat_servers_id,
          user_id: user.id,
        },
      },
      select: { role: true },
    });
    if (!membership || membership.role !== 'admin') {
      client.emit('error', { message: 'Forbidden: admin only' });
      return;
    }
    // Ensure message belongs to this channel
    const msg = await this.prisma.channel_messages.findUnique({
      where: { id: messageId },
      select: { id: true, channel_id: true },
    });
    if (!msg || msg.channel_id !== channelId) {
      client.emit('error', { message: 'Message not found in this channel' });
      return;
    }
    // Update pin state
    const updated = await this.prisma.channel_messages.update({
      where: { id: messageId },
      data: { pinned },
      select: {
        id: true,
        channel_id: true,
        sender_id: true,
        content: true,
        created_at: true,
        pinned: true,
      },
    });
    // Broadcast to channel
    this.server.to(this.channelRoomName(channelId)).emit('message:pinned', {
      id: updated.id,
      channelId: updated.channel_id,
      senderId: updated.sender_id,
      content: updated.content,
      createdAt: updated.created_at,
      pinned: !!updated.pinned,
    });
    client.emit('message:pin:ok', {
      messageId: updated.id,
      pinned: !!updated.pinned,
    });
  }
  //Helper functions
  private async enrichMessagesWithSenderInfo(
    messages: {
      senderId: number;
      [key: string]: any;
    }[],
  ) {
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    if (senderIds.length === 0) return messages;

    const users = await this.prisma.users.findMany({
      where: { id: { in: senderIds } },
      select: {
        id: true,
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            profile_image_url: true,
          },
        },
        business_profiles: {
          select: {
            company_name: true,
            logo_url: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return messages.map((m) => {
      const user = userMap.get(m.senderId);
      return {
        ...m,
        senderFirstName:
          user?.creator_profiles?.first_name ??
          user?.business_profiles?.company_name ??
          null,
        senderLastName: user?.creator_profiles?.last_name ?? null,
        senderImageUrl:
          user?.creator_profiles?.profile_image_url ??
          user?.business_profiles?.logo_url ??
          null,
      };
    });
  }

  private serverRoomName(serverId: number) {
    return `server:${serverId}`;
  }
  private channelRoomName(channelId: number) {
    return `channel:${channelId}`;
  }

  private async canViewServer(
    userId: number,
    serverId: number,
  ): Promise<boolean> {
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: serverId },
      select: { campaign_id: true },
    });
    if (!server) return false;
    const [membership, campaign] = await Promise.all([
      this.prisma.chat_memberships.findUnique({
        where: {
          chat_server_id_user_id: {
            chat_server_id: serverId,
            user_id: userId,
          },
        },
        select: { role: true },
      }),
      this.prisma.campaigns.findUnique({
        where: { id: server.campaign_id },
        select: { business_id: true },
      }),
    ]);
    return !!membership || campaign?.business_id === userId;
  }

  private async canViewChannel(
    userId: number,
    channelId: number,
  ): Promise<boolean> {
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { id: true, chat_servers_id: true, channel_state: true },
    });
    if (!channel) return false;
    const serverId = channel.chat_servers_id;
    let canView = true;
    const chatMemberships = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: serverId, user_id: userId },
      },
      select: { role: true },
    });
    if (chatMemberships?.role === 'admin') {
      return true;
    }
    canView = await this.canViewServer(userId, serverId);
    if (channel.channel_state === 'private') {
      const channelMembership =
        await this.prisma.channel_memberships.findUnique({
          where: {
            channel_id_user_id: { channel_id: channelId, user_id: userId },
          },
          select: { id: true },
        });
      if (!channelMembership) {
        canView = false;
      }
    }

    return canView;
  }

  private async broadcastServerOnline(serverId: number) {
    const chatMemberships = await this.prisma.chat_memberships.findMany({
      where: {
        chat_server_id: serverId,
      },
      select: {
        users: {
          select: {
            id: true,
            email: true,
            user_type: true,
            creator_profiles: {
              select: {
                first_name: true,
                last_name: true,
                profile_image_url: true,
              },
            },
            business_profiles: {
              select: {
                company_name: true,
                logo_url: true,
              },
            },
          },
        },
      },
    });

    const sockets = await this.server
      .in(this.serverRoomName(serverId))
      .fetchSockets();
    const userIds = Array.from(
      new Set(
        sockets
          .map(
            (s) =>
              (s.data && (s.data as any).user && (s.data as any).user.id) || 0,
          )
          .filter((id: number) => id > 0),
      ),
    );

    const onlineIdSet = new Set<number>(userIds);

    const onlineUsersRaw = chatMemberships.filter((m) =>
      onlineIdSet.has(m.users.id),
    );
    const offlineUsersRaw = chatMemberships.filter(
      (m) => !onlineIdSet.has(m.users.id),
    );
    const onlineUsers = onlineUsersRaw.map((m) => ({
      users: {
        id: m.users.id,
        email: m.users.email,
        user_type: m.users.user_type,
        first_name: m.users.creator_profiles?.first_name ?? null,
        last_name: m.users.creator_profiles?.last_name ?? null,
        company_name: m.users.business_profiles?.company_name ?? null,
        profile_image_url:
          m.users.creator_profiles?.profile_image_url ??
          m.users.business_profiles?.logo_url ??
          null,
      },
    }));
    const offlineUsers = offlineUsersRaw.map((m) => ({
      users: {
        id: m.users.id,
        email: m.users.email,
        user_type: m.users.user_type,
        first_name: m.users.creator_profiles?.first_name ?? null,
        last_name: m.users.creator_profiles?.last_name ?? null,
        company_name: m.users.business_profiles?.company_name ?? null,
        profile_image_url:
          m.users.creator_profiles?.profile_image_url ??
          m.users.business_profiles?.logo_url ??
          null,
      },
    }));
    this.server
      .to(this.serverRoomName(serverId))
      .emit('server:online', { serverId, onlineUsers, offlineUsers });
  }

  private async broadcastChannelOnline(serverId: number, channelId: number) {
    // One raw query to resolve permitted users
    const permitted = await this.prisma.$queryRaw<
      { id: number; email: string }[]
    >`
          WITH ch AS (
            SELECT channel_state, chat_servers_id
            FROM public.chat_channels
            WHERE id = ${channelId} AND chat_servers_id = ${serverId}
            LIMIT 1
          ),
          server_members AS (
            SELECT cm.user_id
            FROM public.chat_memberships cm
            WHERE cm.chat_server_id = ${serverId}
          ),
          channel_members AS (
            SELECT cmm.user_id
            FROM public.channel_memberships cmm
            WHERE cmm.channel_id = ${channelId}
          ),
          server_admins AS (
            SELECT cm.user_id
            FROM public.chat_memberships cm
            WHERE cm.chat_server_id = ${serverId} AND cm.role = 'admin'
          ),
          perm AS (
            -- public: all server members
            SELECT user_id FROM server_members
            WHERE (SELECT channel_state FROM ch) <> 'private'
            UNION
            -- private: server admins
            SELECT user_id FROM server_admins
            UNION
            -- private: channel members
            SELECT user_id FROM channel_members
            WHERE (SELECT channel_state FROM ch) = 'private'
          )
          SELECT u.id, u.email
          FROM public.users u
          JOIN perm p ON p.user_id = u.id
        `;

    const sockets = await this.server
      .in(this.serverRoomName(serverId))
      .fetchSockets();
    const userIds = Array.from(
      new Set(
        sockets
          .map(
            (s) =>
              (s.data && (s.data as any).user && (s.data as any).user.id) || 0,
          )
          .filter((id: number) => id > 0),
      ),
    );

    // Enrich permitted users with profile data
    const permittedIds = permitted.map((p) => p.id);
    const permittedDetails =
      permittedIds.length > 0
        ? await this.prisma.users.findMany({
            where: { id: { in: permittedIds } },
            select: {
              id: true,
              email: true,
              user_type: true,
              creator_profiles: {
                select: {
                  first_name: true,
                  last_name: true,
                  profile_image_url: true,
                },
              },
              business_profiles: {
                select: {
                  company_name: true,
                  logo_url: true,
                },
              },
            },
          })
        : [];
    const permitedUsers = permittedDetails.map((u) => ({
      users: {
        id: u.id,
        email: u.email,
        user_type: u.user_type,
        first_name: u.creator_profiles?.first_name ?? null,
        last_name: u.creator_profiles?.last_name ?? null,
        company_name: u.business_profiles?.company_name ?? null,
        profile_image_url:
          u.creator_profiles?.profile_image_url ??
          u.business_profiles?.logo_url ??
          null,
      },
    }));

    const onlineUsers = permitedUsers.filter((u) =>
      userIds.includes(u.users.id),
    );
    const offlineUsers = permitedUsers.filter(
      (u) => !userIds.includes(u.users.id),
    );

    this.server.to(this.channelRoomName(channelId)).emit('channel:online', {
      serverId,
      channelId,
      permitedUsers,
      onlineUsers,
      offlineUsers,
    });
  }

  private async broadcastAllChannelsOnline(serverId: number) {
    const channels = await this.prisma.chat_channels.findMany({
      where: { chat_servers_id: serverId },
      select: { id: true },
    });
    for (const ch of channels) {
      await this.broadcastChannelOnline(serverId, ch.id);
    }
  }
}
