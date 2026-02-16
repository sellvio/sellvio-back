import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { social_platform } from '@prisma/client';

// String constants for lookup-table-based fields (migrated from Prisma enums)
const CAMPAIGN_STATUS_VALUES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const CREATOR_TYPE_VALUES = ['beginner', 'experienced', 'influencer', 'clipper'];

export class ListCampaignsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: CAMPAIGN_STATUS_VALUES,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUS_VALUES)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  business_id?: number;

  @ApiPropertyOptional({
    enum: CREATOR_TYPE_VALUES,
    isArray: true,
    description: 'Filter by target creator types',
    example: ['beginner', 'influencer'],
  })
  @IsOptional()
  @IsArray()
  @IsIn(CREATOR_TYPE_VALUES, { each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  creator_types?: string[];

  @ApiPropertyOptional({
    enum: social_platform,
    isArray: true,
    description: 'Filter by platforms',
    example: ['instagram', 'tiktok'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  platforms?: string[];

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
