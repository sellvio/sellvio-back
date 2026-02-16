import { ApiProperty } from '@nestjs/swagger';

const USER_TYPE_VALUES = ['business', 'creator'];

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({
    enum: USER_TYPE_VALUES,
    example: 'creator',
    description: 'User type',
  })
  user_type: string;

  @ApiProperty({ example: true, description: 'Email verification status' })
  email_verified: boolean;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Account creation date',
  })
  created_at?: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({ type: UserResponseDto, description: 'User information' })
  user: UserResponseDto;
}

export class BusinessProfileDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Company name' })
  company_name: string;

  @ApiProperty({
    example: 'business@company.com',
    description: 'Business email',
    required: false,
  })
  business_email?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: 'https://company.com',
    description: 'Website URL',
    required: false,
  })
  website_url?: string;

  @ApiProperty({
    example: 'https://company.com/logo.png',
    description: 'Logo URL',
    required: false,
  })
  logo_url?: string;

  @ApiProperty({
    example: 'We are a leading company in...',
    description: 'Company description',
    required: false,
  })
  description?: string;
}

export class CreatorProfileDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  last_name: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Nickname/username',
    required: false,
  })
  nickname?: string;

  @ApiProperty({
    example: 'beginner',
    description: 'Creator type',
    required: false,
  })
  creator_type?: string;

  @ApiProperty({
    example: 'Content creator and influencer...',
    description: 'Bio',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL',
    required: false,
  })
  profile_image_url?: string;

  @ApiProperty({ example: 'New York, NY', description: 'Location' })
  location: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  phone?: string;
}

export class ProfileResponseDto extends UserResponseDto {
  @ApiProperty({
    type: BusinessProfileDto,
    description: 'Business profile (only for business users)',
    required: false,
  })
  business_profiles?: BusinessProfileDto;

  @ApiProperty({
    type: CreatorProfileDto,
    description: 'Creator profile (only for creator users)',
    required: false,
  })
  creator_profiles?: CreatorProfileDto;
}
