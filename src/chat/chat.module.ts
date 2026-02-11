import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatChannelsController } from './chat_channels.controller';
import { ChatChannelsService } from './chat_channels.service';
import { ChatGateway } from './chat.gateway';
import {
  ServerInvitesAdminController,
  ServerInvitesController,
} from './server_invites.controller';
import { ServerInvitesService } from './server_invites.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    ChatChannelsController,
    ServerInvitesAdminController,
    ServerInvitesController,
  ],
  providers: [ChatChannelsService, ChatGateway, ServerInvitesService],
})
export class ChatModule {}
