import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  ArrayUnique,
} from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  // channel_type is always set to 'other' by server; admin cannot choose it.

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

  @ApiPropertyOptional({
    description:
      'Optional list of creator user IDs to add to this channel on creation (must be approved participants of the server’s campaign)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  member_user_ids?: number[];
}
