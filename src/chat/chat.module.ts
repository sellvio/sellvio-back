import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatChannelsController } from './chat_channels.controller';
import { ChatChannelsService } from './chat_channels.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [ChatChannelsController],
  providers: [ChatChannelsService, ChatGateway],
})
export class ChatModule {}
