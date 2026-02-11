import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatChannelsService } from './chat_channels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatServerAdminGuard } from '../common/guards/chat-server-admin.guard';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { AddMemberDto } from './dto/add-member.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@ApiTags('Chat Channels')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat-servers/:serverId/channels')
export class ChatChannelsController {
  constructor(private readonly service: ChatChannelsService) {}

  @ApiOperation({ summary: 'Update chat server name (server admin only)' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiBody({ type: UpdateServerDto })
  @ApiResponse({ status: 200, description: 'Server name updated' })
  @UseGuards(ChatServerAdminGuard)
  @Patch('update-server')
  updateServer(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: UpdateServerDto,
  ) {
    return this.service.updateServer(serverId, dto);
  }

  @ApiOperation({ summary: 'List channels in a chat server' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiResponse({ status: 200, description: 'Channels list' })
  @Get()
  list(
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listVisible(serverId, user.id);
  }

  @ApiOperation({ summary: 'Create a channel in a chat server' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiBody({ type: CreateChannelDto })
  @ApiResponse({ status: 201, description: 'Channel created' })
  @UseGuards(ChatServerAdminGuard)
  @Post()
  create(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: CreateChannelDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(serverId, dto, user.id);
  }

  @ApiOperation({
    summary: 'Add a creator to a private channel (server admin only)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({ status: 200, description: 'Member added or already present' })
  @UseGuards(ChatServerAdminGuard)
  @Post(':channelId/members')
  addMember(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addMember(serverId, channelId, dto.user_id, user.id);
  }

  @ApiOperation({
    summary: 'Add multiple creators to a private channel (server admin only)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiBody({ type: AddMembersDto })
  @ApiResponse({ status: 200, description: 'Members added (bulk)' })
  @UseGuards(ChatServerAdminGuard)
  @Post(':channelId/members/bulk')
  addMembers(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: AddMembersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addMembers(serverId, channelId, dto.user_ids, user.id);
  }

  @ApiOperation({
    summary: 'List all server members (visible to server members and owner)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiResponse({ status: 200, description: 'Server members list' })
  @Get('/get/members')
  listServerMembers(
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listServerMembers(serverId, user.id);
  }

  @ApiOperation({
    summary: 'List users who can see a channel (visible to eligible users)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiResponse({ status: 200, description: 'Channel visible users list' })
  @Get(':channelId/users')
  listChannelUsers(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listChannelUsers(serverId, channelId, user.id);
  }
  @ApiOperation({
    summary:
      'List server members available to invite to a channel (excludes existing channel members and requester)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Invitable members list',
  })
  @UseGuards(ChatServerAdminGuard)
  @Get(':channelId/invitable-members')
  listInvitableMembers(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listInvitableMembers(serverId, channelId, user.id);
  }

  @ApiOperation({
    summary: 'Invite a server member to a channel (server admin only)',
  })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({ status: 200, description: 'User invited to channel' })
  @UseGuards(ChatServerAdminGuard)
  @Post(':channelId/invite')
  inviteToChannel(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.inviteToChannel(serverId, channelId, dto.user_id, user.id);
  }

  @ApiOperation({ summary: 'Update a channel' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiBody({ type: UpdateChannelDto })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  @UseGuards(ChatServerAdminGuard)
  @Patch(':channelId')
  update(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.service.update(serverId, channelId, dto);
  }

  @ApiOperation({ summary: 'Delete a channel' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiParam({ name: 'channelId', type: Number })
  @ApiResponse({ status: 200, description: 'Channel deleted' })
  @UseGuards(ChatServerAdminGuard)
  @Delete(':channelId')
  remove(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('channelId', ParseIntPipe) channelId: number,
  ) {
    return this.service.remove(serverId, channelId);
  }
}
