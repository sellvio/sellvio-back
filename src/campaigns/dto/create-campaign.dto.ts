import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsIn,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  MinLength,
  IsDecimal,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { chat_type, social_platform } from '@prisma/client';

const CAMPAIGN_STATUS_VALUES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const CREATOR_TYPE_VALUES = ['beginner', 'experienced', 'influencer'];
const PAYMENT_TYPE_VALUES = ['cost_per_view', 'fixed', 'revenue_share'];

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Collection Campaign' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ example: 'Promote our new summer collection' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  budget: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  budget_hidden?: boolean = false;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  duration_days: number;

  // finish_date is computed server-side from start_date + duration_days

  @ApiPropertyOptional({
    enum: CAMPAIGN_STATUS_VALUES,
    default: 'draft',
  })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUS_VALUES)
  status?: string = 'draft';

  @ApiPropertyOptional({ enum: chat_type, default: chat_type.public })
  @IsOptional()
  @IsEnum(chat_type)
  chat_type?: chat_type = chat_type.public;

  @ApiProperty({ enum: CREATOR_TYPE_VALUES, isArray: true })
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
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }
    return [String(value)];
  })
  @IsIn(CREATOR_TYPE_VALUES, { each: true })
  target_creator_types: string[];

  @ApiPropertyOptional({ example: 'Must have experience with beauty products' })
  @IsOptional()
  @IsString()
  additional_requirements?: string;

  @ApiProperty({ enum: PAYMENT_TYPE_VALUES })
  @IsIn(PAYMENT_TYPE_VALUES)
  payment_type: string;

  @ApiProperty({ example: 50.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  payment_amount: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  payment_per_quantity: number;

  @ApiProperty({ example: 'Create engaging 30-second videos' })
  @IsString()
  @MinLength(10)
  requirements: string;

  @ApiPropertyOptional({ example: 'Young adults aged 18-35' })
  @IsOptional()
  @IsString()
  target_audience?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  campaign_image_url?: string;

  @ApiPropertyOptional({ enum: social_platform, isArray: true })
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
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }
    return [String(value)];
  })
  @IsEnum(social_platform, { each: true })
  platforms?: social_platform[];

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v: any) => String(v));
      } catch {
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }
    return [String(value)];
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Optional media assets (images, links) for the campaign',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Banner Image' },
        url: { type: 'string', example: 'https://example.com/banner.jpg' },
        type: { type: 'string', example: 'image' },
      },
      required: ['name', 'url'],
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
        if (/^https?:\/\//i.test(trimmed)) {
          return [{ name: 'Link', url: trimmed, type: 'link' }];
        }
        return undefined;
      }
    }
    return undefined;
  })
  media?: { name: string; url: string; type?: string }[];
}
