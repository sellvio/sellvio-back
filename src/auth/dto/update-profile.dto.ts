import { ApiPropertyOptional } from '@nestjs/swagger';
import { social_platform } from '@prisma/client';

const USER_TYPE_VALUES = ['business', 'creator'];
const CREATOR_TYPE_VALUES = ['beginner', 'experienced', 'influencer'];
import {
  IsArray,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    enum: USER_TYPE_VALUES,
    description: 'User type (cannot be changed)',
    readOnly: true,
  })
  @IsOptional()
  @IsIn(USER_TYPE_VALUES)
  user_type?: string;

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

  @ApiPropertyOptional({ enum: CREATOR_TYPE_VALUES })
  @IsOptional()
  @IsIn(CREATOR_TYPE_VALUES)
  creator_type?: string;

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
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value))
      return value.map((v) => Number(v)).filter((v) => !isNaN(v));
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed))
          return parsed
            .map((v: any) => Number(v))
            .filter((v: number) => !isNaN(v));
      } catch {
        // fallback CSV
        return trimmed
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      }
      return undefined;
    }
    const n = Number(value);
    return isNaN(n) ? undefined : [n];
  })
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
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return undefined;
      }
    }
    return undefined;
  })
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
  business_employee_range?: string;

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

  @ApiPropertyOptional({ type: Number, description: 'ID from legal_statuses' })
  @IsOptional()
  @IsInt()
  legal_status_id?: number;

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
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value))
      return value.map((v) => Number(v)).filter((v) => !isNaN(v));
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed))
          return parsed
            .map((v: any) => Number(v))
            .filter((v: number) => !isNaN(v));
      } catch {
        // fallback CSV
        return trimmed
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      }
      return undefined;
    }
    const n = Number(value);
    return isNaN(n) ? undefined : [n];
  })
  business_tags?: number[];

  // Utility: explicitly clear optional fields by name
  @ApiPropertyOptional({
    description:
      'List of optional field names to clear (set to null). Example: ["profile_image_url", "logo_url", "business_cover_image_url"]',
    isArray: true,
    type: 'string',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clear_fields?: string[];
}
