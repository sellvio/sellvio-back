import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { user_type } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      email,
      password,
      user_type: userType,
      ...profileData
    } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create user with profile in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.users.create({
        data: {
          email: email.toLowerCase().trim(),
          password_hash: hashedPassword,
          user_type: userType,
        },
      });

      // Create appropriate profile
      if (userType === user_type.business) {
        if (!profileData.company_name) {
          throw new BadRequestException(
            'Company name is required for business accounts',
          );
        }

        await tx.business_profiles.create({
          data: {
            user_id: user.id,
            company_name: profileData.company_name,
            business_email: profileData.business_email,
            phone: profileData.phone,
            website_url: profileData.website_url,
          },
        });

        // Create default business account
        await tx.business_accounts.create({
          data: {
            business_id: user.id,
            currency: 'GEL',
            balance: 0.0,
          },
        });
      } else if (userType === user_type.creator) {
        if (
          !profileData.first_name ||
          !profileData.last_name ||
          !profileData.location
        ) {
          throw new BadRequestException(
            'First name, last name, and location are required for creator accounts',
          );
        }

        await tx.creator_profiles.create({
          data: {
            user_id: user.id,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            nickname: profileData.nickname,
            creator_type: profileData.creator_type,
            location: profileData.location,
            phone: profileData.phone,
          },
        });

        // Create default creator account
        await tx.creator_accounts.create({
          data: {
            creator_id: user.id,
            currency: 'GEL',
            available_balance: 0.0,
          },
        });
      }

      return user;
    });

    // Send verification email
    await this.sendVerificationEmail(result);

    // Generate JWT token
    const { access_token, refresh_token } = this.generateTokens(result);
    await this.storeRefreshToken(result.id, refresh_token);

    return {
      access_token,
      refresh_token,
      user: {
        id: result.id,
        email: result.email,
        user_type: result.user_type,
        email_verified: result.email_verified,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { access_token, refresh_token } = this.generateTokens(user);
    await this.storeRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        email_verified: user.email_verified,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.password_hash, password);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      email_verified: user.email_verified,
    };
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      user_type: user.user_type,
    };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refresh_token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );
    return { access_token, refresh_token };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      const user = await this.prisma.users.findUnique({
        where: { id: decoded.sub },
      });
      if (!user) throw new UnauthorizedException('User not found');

      // Find matching stored refresh token (rolling)
      const now = new Date();
      const storedTokens = await (this.prisma as any).refresh_tokens.findMany({
        where: { user_id: user.id, revoked_at: null, expires_at: { gt: now } },
        orderBy: { created_at: 'desc' },
        take: 5,
      });
      let matched: { id: number } | null = null;
      for (const t of storedTokens) {
        const ok = await argon2.verify(t.token_hash, refreshToken);
        if (ok) {
          matched = { id: t.id };
          break;
        }
      }
      if (!matched)
        throw new UnauthorizedException('Invalid or expired refresh token');

      // Revoke old token and issue new pair
      await (this.prisma as any).refresh_tokens.update({
        where: { id: matched.id },
        data: { revoked_at: new Date() },
      });

      const { access_token, refresh_token } = this.generateTokens(user);
      await this.storeRefreshToken(user.id, refresh_token);
      return { access_token, refresh_token };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async storeRefreshToken(userId: number, refreshToken: string) {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const seconds = this.secondsFromDuration(expiresIn);
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const tokenHash = await argon2.hash(refreshToken);
    await (this.prisma as any).refresh_tokens.create({
      data: { user_id: userId, token_hash: tokenHash, expires_at: expiresAt },
    });
  }

  private secondsFromDuration(input: string): number {
    const m = String(input)
      .trim()
      .match(/^(\d+)([dhms])?$/i);
    if (!m) return Number(input) || 0;
    const value = Number(m[1]);
    const unit = (m[2] || 's').toLowerCase();
    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60;
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      default:
        return value;
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        user_type: true,
        email_verified: true,
        created_at: true,
        business_profiles: {
          select: {
            company_name: true,
            business_email: true,
            phone: true,
            website_url: true,
            logo_url: true,
            description: true,
            business_employee_range: true,
          },
        },
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            nickname: true,
            creator_type: true,
            bio: true,
            profile_image_url: true,
            location: true,
            phone: true,
            date_of_birth: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async sendVerificationEmail(user: any) {
    try {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      // Save token to database
      await this.prisma.email_verification_tokens.create({
        data: {
          user_id: user.id,
          token,
          expires_at: expiresAt,
        },
      });

      // Determine user name for email
      let userName = user.email.split('@')[0]; // fallback
      if (user.user_type === user_type.business) {
        const profile = await this.prisma.business_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.company_name || userName;
      } else if (user.user_type === user_type.creator) {
        const profile = await this.prisma.creator_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.first_name || userName;
      }

      // Send verification email
      await this.emailService.sendVerificationEmail(
        user.email,
        token,
        userName,
      );
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', error);
    }
  }

  async verifyEmail(token: string) {
    // Find valid token
    const verificationToken =
      await this.prisma.email_verification_tokens.findFirst({
        where: {
          token,
          used_at: null,
          expires_at: {
            gt: new Date(),
          },
        },
        include: {
          users: true,
        },
      });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user and mark token as used
    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: verificationToken.user_id },
        data: {
          email_verified: true,
          email_verified_at: new Date(),
        },
      });

      await tx.email_verification_tokens.update({
        where: { id: verificationToken.id },
        data: {
          used_at: new Date(),
        },
      });
    });

    // Send welcome email
    await this.sendWelcomeEmail(verificationToken.users);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async resendVerificationEmail(email: string) {
    // Find user
    const user = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message:
          'If the email exists and is not verified, a verification email has been sent',
      };
    }

    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Invalidate existing tokens
    await this.prisma.email_verification_tokens.updateMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
      data: {
        used_at: new Date(),
      },
    });

    // Send new verification email
    await this.sendVerificationEmail(user);

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  }

  async requestPasswordReset(email: string) {
    // Find user
    const user = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.email_verified) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message:
          'If the email exists and is verified, a password reset email has been sent',
      };
    }

    try {
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

      // Invalidate existing reset tokens
      await this.prisma.password_reset_tokens.updateMany({
        where: {
          user_id: user.id,
          used_at: null,
        },
        data: {
          used_at: new Date(),
        },
      });

      // Save new token
      await this.prisma.password_reset_tokens.create({
        data: {
          user_id: user.id,
          token,
          expires_at: expiresAt,
        },
      });

      // Get user name
      let userName = user.email.split('@')[0];
      if (user.user_type === user_type.business) {
        const profile = await this.prisma.business_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.company_name || userName;
      } else if (user.user_type === user_type.creator) {
        const profile = await this.prisma.creator_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.first_name || userName;
      }

      // Send reset email
      await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
        userName,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      success: true,
      message:
        'If the email exists and is verified, a password reset email has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find valid token
    const resetToken = await this.prisma.password_reset_tokens.findFirst({
      where: {
        token,
        used_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        users: true,
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: resetToken.user_id },
        data: {
          password_hash: hashedPassword,
        },
      });

      await tx.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: {
          used_at: new Date(),
        },
      });
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  private async sendWelcomeEmail(user: any) {
    try {
      let userName = user.email.split('@')[0];
      if (user.user_type === user_type.business) {
        const profile = await this.prisma.business_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.company_name || userName;
      } else if (user.user_type === user_type.creator) {
        const profile = await this.prisma.creator_profiles.findUnique({
          where: { user_id: user.id },
        });
        userName = profile?.first_name || userName;
      }

      await this.emailService.sendWelcomeEmail(
        user.email,
        userName,
        user.user_type,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}
