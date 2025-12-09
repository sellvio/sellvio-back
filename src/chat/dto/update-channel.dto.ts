import { ApiPropertyOptional } from '@nestjs/swagger';
import { channel_type } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChannelDto {
  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: channel_type, example: channel_type.announcements })
  @IsOptional()
  @IsEnum(channel_type)
  channel_type?: channel_type;

  @ApiPropertyOptional({ example: 'Announcement channel only for admins' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}


