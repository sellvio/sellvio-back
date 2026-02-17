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

type WsUser = { id: number; email?: string; user_type?: string };

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Cache for lookup table IDs
  private lookupCache: {
    chatRoleTypes?: Map<string, number>;
    videoStatuses?: Map<string, number>;
  } = {};

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private async getChatRoleTypeId(role: string): Promise<number | null> {
    if (!this.lookupCache.chatRoleTypes) {
      const roles = await this.prisma.chat_role_types.findMany();
      this.lookupCache.chatRoleTypes = new Map(
        roles.map((r) => [r.chat_role_type, r.id]),
      );
    }
    return this.lookupCache.chatRoleTypes.get(role) || null;
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: serverId, user_id: user.id },
      },
      select: { role_id: true },
    });
    if (!membership) {
      client.emit('error', { message: 'You are not a member of this server' });
      return;
    }
    if (membership.role_id === adminRoleId) {
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const requesterMembership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: serverId,
          user_id: requester.id,
        },
      },
      select: { role_id: true },
    });
    if (!requesterMembership || requesterMembership.role_id !== adminRoleId) {
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
      select: { role_id: true },
    });
    if (!targetMembership) {
      client.emit('error', { message: 'User is not in this server' });
      return;
    }
    if (targetMembership.role_id === adminRoleId) {
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
        reply_to_id: number | null;
      }[]
    >`
      SELECT id, channel_id, sender_id, content, created_at, reply_to_id
      FROM public.channel_messages
      WHERE channel_id = ${channelId}
      ORDER BY id DESC
      LIMIT ${limit}
    `;
    const messageIds = rows.map((m) => m.id);
    const replyToIds = rows
      .map((m) => m.reply_to_id)
      .filter((id): id is number => id !== null);
    const [imageMap, reactionMap, replyToMap] = await Promise.all([
      this.batchFetchImages(messageIds),
      this.batchFetchReactions(messageIds),
      this.batchFetchReplyTo(replyToIds),
    ]);
    const mapped = rows
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        images: imageMap.get(m.id) || [],
        reactions: reactionMap.get(m.id) || [],
        replyToId: m.reply_to_id,
        replyTo: m.reply_to_id ? replyToMap.get(m.reply_to_id) || null : null,
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
      imageUrls?: string[];
      replyToId?: number;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const content = String(payload?.content || '').trim();
    const imageUrls = Array.isArray(payload?.imageUrls)
      ? payload.imageUrls
      : [];

    if (imageUrls.length > 5) {
      client.emit('error', { message: 'Maximum 5 images per message' });
      return;
    }

    // Validate Cloudinary URLs
    const cloudinaryPattern = /^https:\/\/res\.cloudinary\.com\//;
    for (const url of imageUrls) {
      if (typeof url !== 'string' || !cloudinaryPattern.test(url)) {
        client.emit('error', { message: 'Invalid image URL' });
        return;
      }
    }

    if (!channelId || (!content && imageUrls.length === 0)) {
      client.emit('error', { message: 'Invalid message' });
      return;
    }
    const replyToId = payload?.replyToId ? Number(payload.replyToId) : null;
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    // Rules channel (channel_type_id = 2): only admin can write
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { channel_type_id: true, chat_servers_id: true },
    });
    // Feedback channel (channel_type_id = 3): block regular messages, use feedback:reply
    if (channel?.channel_type_id === 3) {
      client.emit('error', {
        message: 'Use feedback:reply to send messages in feedback channels',
      });
      return;
    }
    if (channel?.channel_type_id === 2) {
      const adminRoleId = await this.getChatRoleTypeId('admin');
      const membership = await this.prisma.chat_memberships.findUnique({
        where: {
          chat_server_id_user_id: {
            chat_server_id: channel.chat_servers_id,
            user_id: user.id,
          },
        },
        select: { role_id: true },
      });
      if (!membership || membership.role_id !== adminRoleId) {
        client.emit('error', {
          message: 'Only admins can write in this channel',
        });
        return;
      }
    }
    // Validate reply target belongs to the same channel
    if (replyToId) {
      const replyTarget = await this.prisma.channel_messages.findUnique({
        where: { id: replyToId },
        select: { channel_id: true },
      });
      if (!replyTarget || replyTarget.channel_id !== channelId) {
        client.emit('error', {
          message: 'Reply target not found in this channel',
        });
        return;
      }
    }
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        channel_id: number;
        sender_id: number;
        content: string;
        created_at: Date;
        pinned: boolean | null;
        reply_to_id: number | null;
      }[]
    >`
      INSERT INTO public.channel_messages (channel_id, sender_id, content, reply_to_id)
      VALUES (${channelId}, ${user.id}, ${content}, ${replyToId})
      RETURNING id, channel_id, sender_id, content, created_at, pinned, reply_to_id
    `;
    const msg = rows[0];

    // Persist images if any
    if (imageUrls.length > 0) {
      await this.prisma.channel_message_images.createMany({
        data: imageUrls.map((url, i) => ({
          message_id: msg.id,
          image_url: url,
          sort_order: i,
        })),
      });
    }

    // Fetch reply-to message info if replying
    let replyTo: any = null;
    if (msg.reply_to_id) {
      const replyMap = await this.batchFetchReplyTo([msg.reply_to_id]);
      replyTo = replyMap.get(msg.reply_to_id) || null;
    }

    const [enriched] = await this.enrichMessagesWithSenderInfo([
      {
        id: msg.id,
        channelId: msg.channel_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: msg.created_at,
        pinned: !!msg.pinned,
        images: imageUrls,
        reactions: [],
        replyToId: msg.reply_to_id,
        replyTo,
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
    type HistoryRow = {
      id: number;
      channel_id: number;
      sender_id: number;
      content: string;
      created_at: Date;
      pinned: boolean | null;
      reply_to_id: number | null;
    };
    const rows = beforeId
      ? await this.prisma.$queryRaw<HistoryRow[]>`
          SELECT id, channel_id, sender_id, content, created_at, pinned, reply_to_id
          FROM public.channel_messages
          WHERE channel_id = ${channelId} AND id < ${beforeId}
          ORDER BY id DESC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<HistoryRow[]>`
          SELECT id, channel_id, sender_id, content, created_at, pinned, reply_to_id
          FROM public.channel_messages
          WHERE channel_id = ${channelId}
          ORDER BY id DESC
          LIMIT ${limit}
        `;
    const messageIds = rows.map((m) => m.id);
    const replyToIds = rows
      .map((m) => m.reply_to_id)
      .filter((id): id is number => id !== null);
    const [imageMap, reactionMap, replyToMap] = await Promise.all([
      this.batchFetchImages(messageIds),
      this.batchFetchReactions(messageIds),
      this.batchFetchReplyTo(replyToIds),
    ]);
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
        images: imageMap.get(m.id) || [],
        reactions: reactionMap.get(m.id) || [],
        replyToId: m.reply_to_id,
        replyTo: m.reply_to_id ? replyToMap.get(m.reply_to_id) || null : null,
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: channel.chat_servers_id,
          user_id: user.id,
        },
      },
      select: { role_id: true },
    });
    if (!membership || membership.role_id !== adminRoleId) {
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
        reply_to_id: true,
      },
    });
    const [imageMap, reactionMap, replyToMap] = await Promise.all([
      this.batchFetchImages([updated.id]),
      this.batchFetchReactions([updated.id]),
      updated.reply_to_id
        ? this.batchFetchReplyTo([updated.reply_to_id])
        : Promise.resolve(new Map()),
    ]);
    this.server.to(this.channelRoomName(channelId)).emit('message:pinned', {
      id: updated.id,
      channelId: updated.channel_id,
      senderId: updated.sender_id,
      content: updated.content,
      createdAt: updated.created_at,
      pinned: !!updated.pinned,
      images: imageMap.get(updated.id) || [],
      reactions: reactionMap.get(updated.id) || [],
      replyToId: updated.reply_to_id,
      replyTo: updated.reply_to_id
        ? replyToMap.get(updated.reply_to_id) || null
        : null,
    });
    client.emit('message:pin:ok', {
      messageId: updated.id,
      pinned: !!updated.pinned,
    });
  }
  @SubscribeMessage('reaction:add')
  async onReactionAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { channelId: number; messageId: number; emojiId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const messageId = Number(payload?.messageId);
    const emojiId = Number(payload?.emojiId);
    if (!channelId || !messageId || !emojiId) {
      client.emit('error', { message: 'Invalid reaction data' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    const msg = await this.prisma.channel_messages.findUnique({
      where: { id: messageId },
      select: { channel_id: true },
    });
    if (!msg || msg.channel_id !== channelId) {
      client.emit('error', { message: 'Message not found in this channel' });
      return;
    }
    const emoji = await this.prisma.emojis.findUnique({
      where: { id: emojiId },
      select: { id: true, name: true, url: true },
    });
    if (!emoji) {
      client.emit('error', { message: 'Emoji not found' });
      return;
    }
    await this.prisma.message_reactions.upsert({
      where: {
        message_id_user_id_emoji_id: {
          message_id: messageId,
          user_id: user.id,
          emoji_id: emojiId,
        },
      },
      create: { message_id: messageId, user_id: user.id, emoji_id: emojiId },
      update: {},
    });
    this.server.to(this.channelRoomName(channelId)).emit('message:reaction', {
      channelId,
      messageId,
      emojiId,
      emoji: emoji.name,
      emojiUrl: emoji.url,
      userId: user.id,
      action: 'add',
    });
  }

  @SubscribeMessage('reaction:remove')
  async onReactionRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { channelId: number; messageId: number; emojiId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const messageId = Number(payload?.messageId);
    const emojiId = Number(payload?.emojiId);
    if (!channelId || !messageId || !emojiId) {
      client.emit('error', { message: 'Invalid reaction data' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    await this.prisma.message_reactions.deleteMany({
      where: { message_id: messageId, user_id: user.id, emoji_id: emojiId },
    });
    this.server
      .to(this.channelRoomName(channelId))
      .emit('message:reaction:removed', {
        channelId,
        messageId,
        emojiId,
        userId: user.id,
      });
  }

  @SubscribeMessage('message:delete')
  async onMessageDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { channelId: number; messageId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const messageId = Number(payload?.messageId);
    if (!channelId || !messageId) {
      client.emit('error', { message: 'Invalid channel or message id' });
      return;
    }
    const msg = await this.prisma.channel_messages.findUnique({
      where: { id: messageId },
      select: { channel_id: true, sender_id: true },
    });
    if (!msg || msg.channel_id !== channelId) {
      client.emit('error', { message: 'Message not found in this channel' });
      return;
    }
    // Check permissions: sender can delete own, admin can delete any
    if (msg.sender_id !== user.id) {
      const channel = await this.prisma.chat_channels.findUnique({
        where: { id: channelId },
        select: { chat_servers_id: true },
      });
      if (!channel) {
        client.emit('error', { message: 'Channel not found' });
        return;
      }
      const adminRoleId = await this.getChatRoleTypeId('admin');
      const membership = await this.prisma.chat_memberships.findUnique({
        where: {
          chat_server_id_user_id: {
            chat_server_id: channel.chat_servers_id,
            user_id: user.id,
          },
        },
        select: { role_id: true },
      });
      if (!membership || membership.role_id !== adminRoleId) {
        client.emit('error', {
          message: 'You can only delete your own messages',
        });
        return;
      }
    }
    await this.prisma.channel_messages.delete({ where: { id: messageId } });
    this.server
      .to(this.channelRoomName(channelId))
      .emit('message:deleted', { channelId, messageId });
    client.emit('message:delete:ok', { messageId });
  }

  // ── Feedback channel events ──

  @SubscribeMessage('feedback:submit')
  async onFeedbackSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      videoUrl: string;
      coverUrl?: string;
      title: string;
      description?: string;
      durationSeconds?: number;
      fileSize?: number;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const videoUrl = String(payload?.videoUrl || '').trim();
    const title = String(payload?.title || '').trim();
    if (!channelId || !videoUrl || !title) {
      client.emit('error', { message: 'channelId, videoUrl and title are required' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { channel_type_id: true, chat_servers_id: true },
    });
    if (!channel || channel.channel_type_id !== 3) {
      client.emit('error', { message: 'This is not a feedback channel' });
      return;
    }
    // Must not be admin (creators submit videos)
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: channel.chat_servers_id,
          user_id: user.id,
        },
      },
      select: { role_id: true },
    });
    if (membership?.role_id === adminRoleId) {
      client.emit('error', { message: 'Only creators can submit videos' });
      return;
    }
    // Get campaign_id from server
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: channel.chat_servers_id },
      select: { campaign_id: true },
    });
    if (!server) {
      client.emit('error', { message: 'Server not found' });
      return;
    }
    const underReviewId = await this.getVideoStatusId('under_review');
    const video = await this.prisma.campaign_videos.create({
      data: {
        campaign_id: server.campaign_id,
        creator_id: user.id,
        title,
        description: payload.description || null,
        video_url: videoUrl,
        cover_url: payload.coverUrl || null,
        duration_seconds: payload.durationSeconds || null,
        file_size: payload.fileSize || null,
        submitted_at: new Date(),
        status_id: underReviewId,
      },
    });
    // Fetch creator profile for broadcast
    const creator = await this.prisma.users.findUnique({
      where: { id: user.id },
      select: {
        creator_profiles: {
          select: { first_name: true, last_name: true, profile_image_url: true },
        },
      },
    });
    this.server.to(this.channelRoomName(channelId)).emit('feedback:submitted', {
      channelId,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        coverUrl: video.cover_url,
        status: 'under_review',
        creatorId: user.id,
        creatorFirstName: creator?.creator_profiles?.first_name ?? null,
        creatorLastName: creator?.creator_profiles?.last_name ?? null,
        creatorImageUrl: creator?.creator_profiles?.profile_image_url ?? null,
        createdAt: video.created_at,
        messageCount: 0,
      },
    });
  }

  @SubscribeMessage('feedback:videos')
  async onFeedbackVideos(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: number },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    if (!channelId) {
      client.emit('error', { message: 'Invalid channel id' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { channel_type_id: true, chat_servers_id: true },
    });
    if (!channel || channel.channel_type_id !== 3) {
      client.emit('error', { message: 'This is not a feedback channel' });
      return;
    }
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: channel.chat_servers_id },
      select: { campaign_id: true },
    });
    if (!server) {
      client.emit('error', { message: 'Server not found' });
      return;
    }
    const videos = await this.prisma.campaign_videos.findMany({
      where: { campaign_id: server.campaign_id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        video_url: true,
        cover_url: true,
        status_id: true,
        creator_id: true,
        created_at: true,
        video_statuses: { select: { video_status: true } },
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            profile_image_url: true,
          },
        },
        _count: {
          select: {
            channel_messages: {
              where: { channel_id: channelId },
            },
          },
        },
      },
    });
    client.emit('feedback:videos', {
      channelId,
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        videoUrl: v.video_url,
        coverUrl: v.cover_url,
        status: v.video_statuses?.video_status ?? 'under_review',
        creatorId: v.creator_id,
        creatorFirstName: v.creator_profiles?.first_name ?? null,
        creatorLastName: v.creator_profiles?.last_name ?? null,
        creatorImageUrl: v.creator_profiles?.profile_image_url ?? null,
        messageCount: v._count.channel_messages,
        createdAt: v.created_at,
      })),
    });
  }

  @SubscribeMessage('feedback:thread')
  async onFeedbackThread(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      campaignVideoId: number;
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
    const campaignVideoId = Number(payload?.campaignVideoId);
    const limit = Math.min(Math.max(Number(payload?.limit) || 50, 1), 200);
    const beforeId = payload?.beforeId ? Number(payload.beforeId) : undefined;
    if (!channelId || !campaignVideoId) {
      client.emit('error', { message: 'Invalid channel or video id' });
      return;
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    type ThreadRow = {
      id: number;
      channel_id: number;
      sender_id: number;
      content: string;
      created_at: Date;
      reply_to_id: number | null;
    };
    const rows = beforeId
      ? await this.prisma.$queryRaw<ThreadRow[]>`
          SELECT id, channel_id, sender_id, content, created_at, reply_to_id
          FROM public.channel_messages
          WHERE channel_id = ${channelId}
            AND campaign_video_id = ${campaignVideoId}
            AND id < ${beforeId}
          ORDER BY id DESC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<ThreadRow[]>`
          SELECT id, channel_id, sender_id, content, created_at, reply_to_id
          FROM public.channel_messages
          WHERE channel_id = ${channelId}
            AND campaign_video_id = ${campaignVideoId}
          ORDER BY id DESC
          LIMIT ${limit}
        `;
    const messageIds = rows.map((m) => m.id);
    const replyToIds = rows
      .map((m) => m.reply_to_id)
      .filter((id): id is number => id !== null);
    const [imageMap, reactionMap, replyToMap] = await Promise.all([
      this.batchFetchImages(messageIds),
      this.batchFetchReactions(messageIds),
      this.batchFetchReplyTo(replyToIds),
    ]);
    const mapped = rows
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        images: imageMap.get(m.id) || [],
        reactions: reactionMap.get(m.id) || [],
        replyToId: m.reply_to_id,
        replyTo: m.reply_to_id ? replyToMap.get(m.reply_to_id) || null : null,
      }));
    const messages = await this.enrichMessagesWithSenderInfo(mapped);
    client.emit('feedback:thread', {
      channelId,
      campaignVideoId,
      messages,
      nextBeforeId: rows.length > 0 ? rows[rows.length - 1].id : null,
      hasMore: rows.length === limit,
    });
  }

  @SubscribeMessage('feedback:reply')
  async onFeedbackReply(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      campaignVideoId: number;
      content: string;
      imageUrls?: string[];
      replyToId?: number;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const campaignVideoId = Number(payload?.campaignVideoId);
    const content = String(payload?.content || '').trim();
    const imageUrls = Array.isArray(payload?.imageUrls)
      ? payload.imageUrls
      : [];
    const replyToId = payload?.replyToId ? Number(payload.replyToId) : null;
    if (!channelId || !campaignVideoId || (!content && imageUrls.length === 0)) {
      client.emit('error', { message: 'Invalid feedback reply' });
      return;
    }
    if (imageUrls.length > 5) {
      client.emit('error', { message: 'Maximum 5 images per message' });
      return;
    }
    const cloudinaryPattern = /^https:\/\/res\.cloudinary\.com\//;
    for (const url of imageUrls) {
      if (typeof url !== 'string' || !cloudinaryPattern.test(url)) {
        client.emit('error', { message: 'Invalid image URL' });
        return;
      }
    }
    const can = await this.canViewChannel(user.id, channelId);
    if (!can) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    // Verify video exists
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id: campaignVideoId },
      select: { creator_id: true },
    });
    if (!video) {
      client.emit('error', { message: 'Video not found' });
      return;
    }
    // Only the video creator or server admin can reply
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { chat_servers_id: true },
    });
    if (!channel) {
      client.emit('error', { message: 'Channel not found' });
      return;
    }
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: channel.chat_servers_id,
          user_id: user.id,
        },
      },
      select: { role_id: true },
    });
    const isAdmin = membership?.role_id === adminRoleId;
    if (!isAdmin && video.creator_id !== user.id) {
      client.emit('error', {
        message: 'Only the video creator or admin can reply',
      });
      return;
    }
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        channel_id: number;
        sender_id: number;
        content: string;
        created_at: Date;
        reply_to_id: number | null;
      }[]
    >`
      INSERT INTO public.channel_messages (channel_id, sender_id, content, campaign_video_id, reply_to_id)
      VALUES (${channelId}, ${user.id}, ${content}, ${campaignVideoId}, ${replyToId})
      RETURNING id, channel_id, sender_id, content, created_at, reply_to_id
    `;
    const msg = rows[0];
    if (imageUrls.length > 0) {
      await this.prisma.channel_message_images.createMany({
        data: imageUrls.map((url, i) => ({
          message_id: msg.id,
          image_url: url,
          sort_order: i,
        })),
      });
    }
    let replyTo: any = null;
    if (msg.reply_to_id) {
      const replyMap = await this.batchFetchReplyTo([msg.reply_to_id]);
      replyTo = replyMap.get(msg.reply_to_id) || null;
    }
    const [enriched] = await this.enrichMessagesWithSenderInfo([
      {
        id: msg.id,
        channelId: msg.channel_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: msg.created_at,
        images: imageUrls,
        reactions: [],
        replyToId: msg.reply_to_id,
        replyTo,
        campaignVideoId,
      },
    ]);
    this.server
      .to(this.channelRoomName(channelId))
      .emit('feedback:message', enriched);
    client.emit('feedback:reply:ack', { id: msg.id });
  }

  @SubscribeMessage('feedback:review')
  async onFeedbackReview(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: number;
      campaignVideoId: number;
      status: string;
      comment?: string;
    },
  ) {
    const user: WsUser | undefined = (client.data as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    const channelId = Number(payload?.channelId);
    const campaignVideoId = Number(payload?.campaignVideoId);
    const status = String(payload?.status || '').trim();
    if (
      !channelId ||
      !campaignVideoId ||
      !['approved', 'rejected'].includes(status)
    ) {
      client.emit('error', {
        message: 'Invalid review data (status must be approved or rejected)',
      });
      return;
    }
    // Admin only
    const channel = await this.prisma.chat_channels.findUnique({
      where: { id: channelId },
      select: { chat_servers_id: true, channel_type_id: true },
    });
    if (!channel || channel.channel_type_id !== 3) {
      client.emit('error', { message: 'This is not a feedback channel' });
      return;
    }
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: channel.chat_servers_id,
          user_id: user.id,
        },
      },
      select: { role_id: true },
    });
    if (!membership || membership.role_id !== adminRoleId) {
      client.emit('error', { message: 'Forbidden: admin only' });
      return;
    }
    // Verify video exists and belongs to this campaign
    const server = await this.prisma.chat_servers.findUnique({
      where: { id: channel.chat_servers_id },
      select: { campaign_id: true },
    });
    if (!server) {
      client.emit('error', { message: 'Server not found' });
      return;
    }
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id: campaignVideoId },
      select: { id: true, campaign_id: true },
    });
    if (!video || video.campaign_id !== server.campaign_id) {
      client.emit('error', { message: 'Video not found in this campaign' });
      return;
    }
    const statusId = await this.getVideoStatusId(status);
    await this.prisma.campaign_videos.update({
      where: { id: campaignVideoId },
      data: {
        status_id: statusId,
        reviewed_at: new Date(),
        reviewed_by: user.id,
        review_comments: payload.comment || null,
      },
    });
    // If there's a comment, insert it as a thread message
    if (payload.comment?.trim()) {
      await this.prisma.$queryRaw`
        INSERT INTO public.channel_messages (channel_id, sender_id, content, campaign_video_id)
        VALUES (${channelId}, ${user.id}, ${payload.comment.trim()}, ${campaignVideoId})
      `;
    }
    this.server.to(this.channelRoomName(channelId)).emit('feedback:reviewed', {
      channelId,
      campaignVideoId,
      status,
      comment: payload.comment || null,
      reviewedBy: user.id,
    });
    client.emit('feedback:review:ok', { campaignVideoId, status });
  }

  //Helper functions
  private async batchFetchReactions(messageIds: number[]): Promise<
    Map<
      number,
      {
        emojiId: number;
        emoji: string;
        emojiUrl: string;
        users: { id: number; firstName: string | null }[];
      }[]
    >
  > {
    if (messageIds.length === 0) return new Map();
    const reactions = await this.prisma.message_reactions.findMany({
      where: { message_id: { in: messageIds } },
      select: {
        message_id: true,
        emoji_id: true,
        emojis: { select: { name: true, url: true } },
        users: {
          select: {
            id: true,
            creator_profiles: { select: { first_name: true } },
            business_profiles: { select: { company_name: true } },
          },
        },
      },
    });
    const map = new Map<
      number,
      {
        emojiId: number;
        emoji: string;
        emojiUrl: string;
        users: { id: number; firstName: string | null }[];
      }[]
    >();
    for (const r of reactions) {
      const arr = map.get(r.message_id) || [];
      let group = arr.find((g) => g.emojiId === r.emoji_id);
      if (!group) {
        group = {
          emojiId: r.emoji_id,
          emoji: r.emojis.name,
          emojiUrl: r.emojis.url,
          users: [],
        };
        arr.push(group);
      }
      group.users.push({
        id: r.users.id,
        firstName:
          r.users.creator_profiles?.first_name ??
          r.users.business_profiles?.company_name ??
          null,
      });
      map.set(r.message_id, arr);
    }
    return map;
  }

  private async batchFetchReplyTo(replyToIds: number[]): Promise<
    Map<
      number,
      {
        id: number;
        content: string;
        senderId: number;
        senderFirstName: string | null;
      }
    >
  > {
    if (replyToIds.length === 0) return new Map();
    const msgs = await this.prisma.channel_messages.findMany({
      where: { id: { in: replyToIds } },
      select: {
        id: true,
        content: true,
        sender_id: true,
        users: {
          select: {
            creator_profiles: { select: { first_name: true } },
            business_profiles: { select: { company_name: true } },
          },
        },
      },
    });
    const map = new Map<
      number,
      {
        id: number;
        content: string;
        senderId: number;
        senderFirstName: string | null;
      }
    >();
    for (const m of msgs) {
      map.set(m.id, {
        id: m.id,
        content: m.content,
        senderId: m.sender_id,
        senderFirstName:
          m.users.creator_profiles?.first_name ??
          m.users.business_profiles?.company_name ??
          null,
      });
    }
    return map;
  }

  private async batchFetchImages(
    messageIds: number[],
  ): Promise<Map<number, string[]>> {
    if (messageIds.length === 0) return new Map();
    const images = await this.prisma.channel_message_images.findMany({
      where: { message_id: { in: messageIds } },
      orderBy: { sort_order: 'asc' },
      select: { message_id: true, image_url: true },
    });
    const map = new Map<number, string[]>();
    for (const img of images) {
      const arr = map.get(img.message_id) || [];
      arr.push(img.image_url);
      map.set(img.message_id, arr);
    }
    return map;
  }

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
        select: { role_id: true },
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
    const chatMemberships = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: { chat_server_id: serverId, user_id: userId },
      },
      select: { role_id: true },
    });
    if (chatMemberships?.role_id === adminRoleId) {
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
            user_type_id: true,
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
        user_type_id: m.users.user_type_id,
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
        user_type_id: m.users.user_type_id,
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
    const adminRoleId = await this.getChatRoleTypeId('admin');
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
            WHERE cm.chat_server_id = ${serverId} AND cm.role_id = ${adminRoleId}
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
              user_type_id: true,
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
        user_type_id: u.user_type_id,
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
