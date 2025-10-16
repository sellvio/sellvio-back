import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  MinLength,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  campaign_status,
  chat_type,
  creator_type,
  payment_type,
  social_platform,
} from '@prisma/client';

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
    enum: campaign_status,
    default: campaign_status.draft,
  })
  @IsOptional()
  @IsEnum(campaign_status)
  status?: campaign_status = campaign_status.draft;

  @ApiPropertyOptional({ enum: chat_type, default: chat_type.public })
  @IsOptional()
  @IsEnum(chat_type)
  chat_type?: chat_type = chat_type.public;

  @ApiProperty({ enum: creator_type, isArray: true })
  @IsArray()
  @IsEnum(creator_type, { each: true })
  target_creator_types: creator_type[];

  @ApiPropertyOptional({ example: 'Must have experience with beauty products' })
  @IsOptional()
  @IsString()
  additional_requirements?: string;

  @ApiProperty({ enum: payment_type })
  @IsEnum(payment_type)
  payment_type: payment_type;

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
  @IsEnum(social_platform, { each: true })
  platforms?: social_platform[];

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
  media?: { name: string; url: string; type?: string }[];
}
