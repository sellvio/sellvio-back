import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  creator_type,
  legal_status,
  social_platform,
  user_type,
} from '@prisma/client';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    enum: user_type,
    description: 'User type (cannot be changed)',
    readOnly: true,
  })
  @IsOptional()
  @IsEnum(user_type)
  user_type?: user_type;

  // Creator updatable fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ enum: Object.values(creator_type) })
  @IsOptional()
  @IsEnum(creator_type)
  creator_type?: creator_type;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  date_of_birth?: Date;

  @ApiPropertyOptional({
    description: 'Replace creator tags with these tag IDs',
  })
  @IsOptional()
  @IsArray()
  tags?: number[];

  @ApiPropertyOptional({
    description: 'Replace social media accounts (creator only) with given list',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: Object.values(social_platform) },
        profile_url: { type: 'string' },
      },
      required: ['platform', 'profile_url'],
    },
  })
  @IsOptional()
  @IsArray()
  social_media_account?: { platform: social_platform; profile_url: string }[];

  // Business updatable fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  company_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  business_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Object.values(legal_status) })
  @IsOptional()
  @IsEnum(legal_status)
  legal_status?: legal_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  business_cover_image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  business_industry_name?: string;

  @ApiPropertyOptional({
    description: 'Replace business tags with these tag IDs',
  })
  @IsOptional()
  @IsArray()
  business_tags?: number[];
}
