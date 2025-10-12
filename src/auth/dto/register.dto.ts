import { Transform } from 'class-transformer';
import {
  isArray,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { user_type, creator_type, social_platform } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  email!: string;

  @ApiProperty({
    minLength: 12,
    maxLength: 72,
    example: 'very-strong-password',
  })
  @IsString()
  @Length(12, 72)
  password!: string;

  @ApiProperty({ enum: user_type, example: user_type.creator })
  @IsEnum(user_type)
  user_type!: user_type;

  // Creator fields (optional if user_type is CREATOR)
  @ApiPropertyOptional({ enum: Object.values(creator_type) })
  @IsOptional()
  @IsEnum(creator_type)
  creator_type?: creator_type;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  date_of_birth?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  social_media_account?: { platform: social_platform; profile_url: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  // Business fields (optional if user_type is BUSINESS)
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  company_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  legal_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  business_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  business_cover_image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  business_industry_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  business_tags?: number[];
}
