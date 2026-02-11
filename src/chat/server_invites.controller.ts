import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ServerInvitesService } from './server_invites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatServerAdminGuard } from '../common/guards/chat-server-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateServerInviteDto } from './dto/create-server-invite.dto';
import { CreateServerInvitesDto } from './dto/create-server-invites.dto';
import { RespondInviteDto } from './dto/respond-invite.dto';

// ── Admin endpoints ──────────────────────────────────────────────────

@ApiTags('Server Invites (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat-servers/:serverId/invites')
export class ServerInvitesAdminController {
  constructor(private readonly service: ServerInvitesService) {}

  @ApiOperation({ summary: 'Invite a creator to the server (admin only)' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiBody({ type: CreateServerInviteDto })
  @ApiResponse({ status: 201, description: 'Invite created' })
  @UseGuards(ChatServerAdminGuard)
  @Post()
  createInvite(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: CreateServerInviteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createInvite(serverId, dto.user_id, user.id);
  }

  @ApiOperation({ summary: 'Invite multiple creators to the server (admin only)' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiBody({ type: CreateServerInvitesDto })
  @ApiResponse({ status: 201, description: 'Bulk invites created' })
  @UseGuards(ChatServerAdminGuard)
  @Post('bulk')
  createInvites(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: CreateServerInvitesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createInvites(serverId, dto.user_ids, user.id);
  }

  @ApiOperation({ summary: 'List invites for this server (admin only)' })
  @ApiParam({ name: 'serverId', type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'accepted', 'declined'] })
  @ApiResponse({ status: 200, description: 'Server invites list' })
  @UseGuards(ChatServerAdminGuard)
  @Get()
  listServerInvites(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Query('status') status?: string,
  ) {
    return this.service.listServerInvites(serverId, status);
  }
}

// ── Creator endpoints ────────────────────────────────────────────────

@ApiTags('Server Invites (Creator)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('server-invites')
export class ServerInvitesController {
  constructor(private readonly service: ServerInvitesService) {}

  @ApiOperation({ summary: 'List my pending server invites' })
  @ApiResponse({ status: 200, description: 'Pending invites for the current user' })
  @Get('me')
  listMyInvites(@CurrentUser() user: RequestUser) {
    return this.service.listMyInvites(user.id);
  }

  @ApiOperation({ summary: 'Accept or decline a server invite' })
  @ApiParam({ name: 'inviteId', type: Number })
  @ApiBody({ type: RespondInviteDto })
  @ApiResponse({ status: 200, description: 'Invite response recorded' })
  @Patch(':inviteId/respond')
  respondToInvite(
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @Body() dto: RespondInviteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.respondToInvite(inviteId, user.id, dto.action);
  }
}
