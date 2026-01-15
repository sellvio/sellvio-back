import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { campaign_status, creator_type, social_platform } from '@prisma/client';

export class ListCampaignsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: campaign_status,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(campaign_status)
  status?: campaign_status;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  business_id?: number;

  @ApiPropertyOptional({
    enum: creator_type,
    isArray: true,
    description: 'Filter by target creator types',
    example: ['beginner', 'influencer'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(creator_type, { each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  creator_types?: creator_type[];

  @ApiPropertyOptional({
    enum: social_platform,
    isArray: true,
    description: 'Filter by platforms',
    example: ['instagram', 'tiktok'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(social_platform, { each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  platforms?: social_platform[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by tag names',
    example: ['fashion', 'summer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  tags?: string[];
}
