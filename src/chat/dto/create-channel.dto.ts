import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { channel_type } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, IsIn } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: channel_type, example: channel_type.general })
  @IsOptional()
  @IsEnum(channel_type)
  channel_type?: channel_type;

  @ApiPropertyOptional({ example: 'public', enum: ['public', 'private'] })
  @IsOptional()
  @IsString()
  @IsIn(['public', 'private'])
  channel_state?: string;

  @ApiPropertyOptional({ example: 'Discussion channel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}


