import { Module } from '@nestjs/common';
import { ChatChannelsController } from './chat_channels.controller';
import { ChatChannelsService } from './chat_channels.service';

@Module({
  controllers: [ChatChannelsController],
  providers: [ChatChannelsService],
})
export class ChatModule {}


