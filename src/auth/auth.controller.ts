import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, ProfileResponseDto } from './dto/auth-response.dto';
import {
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  EmailVerificationResponseDto,
} from './dto/email-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Patch, Put } from '@nestjs/common';
import { ConditionalMulterInterceptor } from '../common/interceptors/conditional-multer.interceptor';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

function ensureUploadsDir(): string {
  const baseDir = join(process.cwd(), 'uploads');
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  const imagesDir = join(baseDir, 'images');
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `img_${timestamp}_${random}${extension}`;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new user',
    description: `Register a new user account. The registration process creates both a user account and the appropriate profile (business or creator) based on the user type.

**Business Registration Requirements:**
- Company name is required
- Creates a default business account with GEL currency

**Creator Registration Requirements:**
- First name, last name, and location are required
- Creates a default creator account with GEL currency

**Response includes:**
- JWT access token for immediate authentication
- User information including profile data`,
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    schema: {
      example: {
        statusCode: 409,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/register',
        method: 'POST',
        error: 'Conflict',
        message: 'Email already registered',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or missing required fields',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/register',
        method: 'POST',
        error: 'Bad Request',
        message: 'Company name is required for business accounts',
      },
    },
  })
  @ApiBody({
    description: 'Register body (example shown for a creator user)',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'very-strong-password' },
        user_type: { type: 'string', example: 'creator' },
        creator_type: { type: 'string', example: 'beginner' },
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        nickname: { type: 'string', example: 'johnd' },
        date_of_birth: {
          type: 'string',
          format: 'date-time',
          example: '1999-01-01T00:00:00.000Z',
        },
        tags: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] },
        social_media_account: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              platform: { type: 'string', example: 'tiktok' },
              profile_url: {
                type: 'string',
                example: 'https://tiktok.com/@your_handle',
              },
            },
            required: ['platform', 'profile_url'],
          },
          example: [
            {
              platform: 'tiktok',
              profile_url: 'https://tiktok.com/@your_handle',
            },
          ],
        },
        location: { type: 'string', example: 'Tbilisi' },
        // Business-only optional fields if user_type is business
        company_name: { type: 'string', example: 'Acme Corp' },
        legal_status: { type: 'string', example: 'StartupLLC' },
        website_url: { type: 'string', example: 'https://acme.example' },
        business_email: { type: 'string', example: 'contact@acme.example' },
        phone: { type: 'string', example: '+995 555 123456' },
        logo_url: { type: 'string', example: 'https://img.example/logo.png' },
        business_cover_image_url: {
          type: 'string',
          example: 'https://img.example/cover.png',
        },
        business_industry_name: { type: 'string', example: 'Marketing' },
        business_tags: {
          type: 'array',
          items: { type: 'number' },
          example: [9, 10],
        },
      },
      required: ['email', 'password', 'user_type'],
    },
  })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Login user',
    description: `Authenticate user with email and password.

**Requirements:**
- Valid email address
- Password (minimum 6 characters)
- Email must be verified

**Response includes:**
- JWT access token valid for 24 hours
- User information`,
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
    schema: {
      example: {
        statusCode: 401,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/login',
        method: 'POST',
        error: 'Unauthorized',
        message: 'Invalid credentials',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/login',
        method: 'POST',
        error: 'Bad Request',
        message: 'Email must be a valid email address',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiBody({
    description: 'Login body',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'very-strong-password' },
        user_type: {
          type: 'string',
          enum: ['business', 'creator'],
          description: 'Optional; if provided, must match stored user type',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed',
    type: AuthResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          description: 'Refresh token (JWT)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refresh_token'],
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @ApiOperation({
    summary: 'Get current user profile',
    description: `Retrieve the complete profile of the currently authenticated user.

**Requires:**
- Valid JWT token in Authorization header

**Returns:**
- Complete user information
- Business profile (for business users)
- Creator profile (for creator users)
- Account information`,
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/profile',
        method: 'GET',
        error: 'Unauthorized',
        message: 'User not found',
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.id);
  }

  @ApiOperation({
    summary: 'Edit current user profile',
    description: `Update profile fields for the authenticated user. The updatable fields depend on the user's type.

For creator users, you can update: first_name, last_name, nickname, creator_type, bio, profile_image_url, location, phone, date_of_birth, tags (replace), and social_media_account (replace).

For business users, you can update: company_name, business_email, phone, website_url, logo_url, description, legal_status, location, business_cover_image_url, business_industry_name, and business_tags (replace).`,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description:
      'Edit profile with optional images. Send text fields as form fields. For files, use fields: profile_image (creator→profile_image_url, business→logo_url) and cover_image (business→business_cover_image_url). To delete values of optional fields, provide clear_fields as a string array of field names to clear.',
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        nickname: { type: 'string' },
        bio: { type: 'string' },
        location: { type: 'string' },
        phone: { type: 'string' },
        date_of_birth: { type: 'string', format: 'date-time' },
        company_name: { type: 'string' },
        business_email: { type: 'string' },
        website_url: { type: 'string' },
        description: { type: 'string' },
        legal_status: { type: 'string' },
        business_industry_name: { type: 'string' },
        business_employee_range: { type: 'string' },
        business_tags: { type: 'array', items: { type: 'number' } },
        // Creator tags
        tags: { type: 'array', items: { type: 'number' } },
        // Upload files using DB-field names
        profile_image_url: { type: 'string', format: 'binary' },
        logo_url: { type: 'string', format: 'binary' },
        business_cover_image_url: { type: 'string', format: 'binary' },
        clear_fields: {
          type: 'array',
          items: { type: 'string' },
          example: ['profile_image_url', 'business_cover_image_url'],
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ConditionalMulterInterceptor)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles()
    files?: {
      profile_image_url?: any[];
      logo_url?: any[];
      business_cover_image_url?: any[];
    },
  ) {
    const dbProfileFile = files?.profile_image_url?.[0];
    const dbLogoFile = files?.logo_url?.[0];
    const dbCoverFile = files?.business_cover_image_url?.[0];

    // Map uploaded image files to DB URL fields by user type
    if (user.user_type === 'creator') {
      const effectiveProfileFile = dbProfileFile;
      if (effectiveProfileFile) {
        const url = `/uploads/images/${effectiveProfileFile.filename}`;
        (dto as any).profile_image_url = url;
      }
    } else {
      const effectiveLogoFile = dbLogoFile;
      if (effectiveLogoFile) {
        const url = `/uploads/images/${effectiveLogoFile.filename}`;
        (dto as any).logo_url = url;
      }
      const effectiveCoverFile = dbCoverFile;
      if (effectiveCoverFile) {
        const url = `/uploads/images/${effectiveCoverFile.filename}`;
        (dto as any).business_cover_image_url = url;
      }
    }
    return this.authService.updateProfile(user.id, dto);
  }

  @ApiOperation({
    summary: 'Verify email address',
    description: `Verify user email address using verification token.

**Process:**
- User clicks verification link from email
- Token is validated and marked as used
- User's email_verified status is updated to true
- Welcome email is sent upon successful verification

**Token Rules:**
- Tokens expire after 24 hours
- Each token can only be used once
- Invalid or expired tokens return error`,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/verify-email',
        method: 'POST',
        error: 'Bad Request',
        message: 'Invalid or expired verification token',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @ApiOperation({
    summary: 'Resend email verification',
    description: `Resend email verification link to user.

**Requirements:**
- Valid email address
- User must exist in the system
- Email must not be already verified

**Process:**
- Generates new verification token
- Invalidates any existing tokens for the user
- Sends new verification email
- Token expires in 24 hours`,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or user not found',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/resend-verification',
        method: 'POST',
        error: 'Bad Request',
        message: 'Email is already verified',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  @ApiOperation({
    summary: 'Request password reset',
    description: `Send password reset email to user.

**Requirements:**
- Valid email address
- User must exist in the system
- Email must be verified

**Process:**
- Generates secure reset token
- Invalidates any existing reset tokens
- Sends password reset email
- Token expires in 1 hour

**Security Features:**
- Rate limiting on password reset requests
- Secure token generation
- Email validation required`,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset requests',
    schema: {
      example: {
        statusCode: 429,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/forgot-password',
        method: 'POST',
        error: 'Too Many Requests',
        message: 'Too many password reset requests. Please try again later.',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto.email);
  }

  @ApiOperation({
    summary: 'Reset password with token',
    description: `Reset user password using reset token.

**Requirements:**
- Valid reset token (not expired or used)
- Strong password (minimum 6 characters)

**Process:**
- Validates reset token
- Hashes new password securely
- Updates user password
- Marks token as used
- Invalidates all user sessions

**Security Features:**
- Token can only be used once
- Password strength validation
- Automatic session invalidation
- Secure password hashing`,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/reset-password',
        method: 'POST',
        error: 'Bad Request',
        message: 'Invalid or expired reset token',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}
