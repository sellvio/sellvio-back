import { Transform } from 'class-transformer';
import {
  isArray,
  IsArray,
  IsDate,
  IsEmail,
  IsIn,
  IsOptional,
  IsInt,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
const USER_TYPE_VALUES = ['business', 'creator'];
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

  @ApiProperty({ enum: USER_TYPE_VALUES, example: 'creator' })
  @IsIn(USER_TYPE_VALUES)
  user_type!: string;

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
  company_nickName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  legal_status_id?: number;

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
  @IsArray()
  business_tags?: number[];
}
