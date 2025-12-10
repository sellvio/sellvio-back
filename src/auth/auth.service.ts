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
import { business_industry, user_type } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

      if (userType === user_type.business) {
        // Create appropriate profile
        const legalStatus = await this.prisma.legal_statuses.findUnique({
          where: { id: Number(profileData.legal_status_id) },
        });

        if (!legalStatus) {
          throw new BadRequestException('Legal status not found');
        }
        if (
          !profileData.company_name ||
          !profileData.company_nickName ||
          !profileData.legal_status_id ||
          !profileData.business_email ||
          !profileData.phone
        ) {
          throw new BadRequestException(
            'Company name, company nickname, legal_status_id, business email and phone are required for business accounts',
          );
        }

        await tx.business_profiles.create({
          data: {
            user_id: user.id,
            company_name: profileData.company_name,
            business_email: profileData.business_email,
            phone: profileData.phone,
            website_url: profileData.website_url,
            legal_status_id: Number(profileData.legal_status_id),
            company_nickName: profileData.company_nickName,
          },
        });

        if (profileData.business_tags) {
          await tx.business_tags.createMany({
            data: profileData.business_tags.map((tag) => ({
              business_id: user.id,
              tag_id: Number(tag),
            })),
          });
        }

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
          !profileData.nickname ||
          !profileData.date_of_birth
        ) {
          throw new BadRequestException(
            'Email, Password, User Type, First name, last name, nickname and date of birth are required for creator accounts',
          );
        }

        await tx.creator_profiles.create({
          data: {
            user_id: user.id,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            nickname: profileData.nickname,
            date_of_birth: profileData.date_of_birth,
          },
        });

        // Create default creator account
        const creatorCurrencyCode = (
          process.env.DEFAULT_CURRENCY_CODE || 'GEL'
        ).toUpperCase();
        const creatorCurrencyName =
          process.env.DEFAULT_CURRENCY_NAME || 'Georgian Lari';
        await tx.currencies.upsert({
          where: { code: creatorCurrencyCode },
          update: {},
          create: { code: creatorCurrencyCode, name: creatorCurrencyName },
        });
        await tx.creator_accounts.create({
          data: {
            creator_id: user.id,
            currency: creatorCurrencyCode,
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

    // If client provided user_type, ensure it matches stored user type
    if (loginDto.user_type && loginDto.user_type !== user.user_type) {
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
            business_cover_image_url: true,
            legal_status: {
              select: {
                id: true,
                code: true,
                name_en: true,
                name_ka: true,
              },
            },
            location: true,
            business_industry_name: true,
            business_tags: {
              select: {
                tag_id: true,
                tags: {
                  select: {
                    name: true,
                  },
                },
              },
            },
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
            creator_tags: {
              select: {
                tag_id: true,
                tags: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, user_type: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const clearFields = new Set(
        (dto.clear_fields || []).map((f) => String(f).trim()),
      );
      if (user.user_type === user_type.creator) {
        const creatorData: any = {};
        // Apply explicit clears first
        if (clearFields.has('profile_image_url'))
          creatorData.profile_image_url = null;
        if (clearFields.has('bio')) creatorData.bio = null;
        if (clearFields.has('nickname')) creatorData.nickname = null;
        if (clearFields.has('location')) creatorData.location = null;
        if (clearFields.has('phone')) creatorData.phone = null;
        if (clearFields.has('date_of_birth')) creatorData.date_of_birth = null;

        if (dto.first_name !== undefined)
          creatorData.first_name = dto.first_name;
        if (dto.last_name !== undefined) creatorData.last_name = dto.last_name;
        if (dto.nickname !== undefined) creatorData.nickname = dto.nickname;
        if (dto.creator_type !== undefined)
          creatorData.creator_type = dto.creator_type;
        if (dto.bio !== undefined) creatorData.bio = dto.bio;
        if (dto.profile_image_url !== undefined)
          creatorData.profile_image_url = dto.profile_image_url;
        if (dto.location !== undefined) creatorData.location = dto.location;
        if (dto.phone !== undefined) creatorData.phone = dto.phone;
        if (dto.date_of_birth !== undefined)
          creatorData.date_of_birth = dto.date_of_birth as any;

        console.log(creatorData);
        if (Object.keys(creatorData).length > 0) {
          await tx.creator_profiles.update({
            where: { user_id: userId },
            data: creatorData,
          });
        }

        if (dto.tags !== undefined) {
          await tx.creator_tags.deleteMany({ where: { creator_id: userId } });
          if (dto.tags.length > 0) {
            await tx.creator_tags.createMany({
              data: dto.tags.map((tagId) => ({
                creator_id: userId,
                tag_id: Number(tagId),
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.social_media_account !== undefined) {
          await tx.social_media_accounts.deleteMany({
            where: { creator_id: userId },
          });
          if (dto.social_media_account.length > 0) {
            await tx.social_media_accounts.createMany({
              data: dto.social_media_account.map((acc) => ({
                creator_id: userId,
                platform: acc.platform,
                profile_url: acc.profile_url,
              })),
              skipDuplicates: true,
            });
          }
        }
      } else if (user.user_type === user_type.business) {
        const businessData: any = {};
        // Apply explicit clears first (only optional/nullable fields)
        if (clearFields.has('logo_url')) businessData.logo_url = null;
        if (clearFields.has('business_cover_image_url'))
          businessData.business_cover_image_url = null;
        if (clearFields.has('website_url')) businessData.website_url = null;
        if (clearFields.has('description')) businessData.description = null;
        if (clearFields.has('location')) businessData.location = null;
        if (clearFields.has('phone')) businessData.phone = null;
        if (clearFields.has('business_industry_name'))
          businessData.business_industry_name = null;
        if (clearFields.has('business_email'))
          businessData.business_email = null;
        if (clearFields.has('business_employee_range'))
          businessData.business_employee_range = null;

        if (dto.company_name !== undefined)
          businessData.company_name = dto.company_name;
        if (dto.business_email !== undefined)
          businessData.business_email = dto.business_email;
        if (dto.phone !== undefined) businessData.phone = dto.phone;
        if (dto.website_url !== undefined)
          businessData.website_url = dto.website_url;
        if (dto.logo_url !== undefined) businessData.logo_url = dto.logo_url;
        if (dto.description !== undefined)
          businessData.description = dto.description;
        if (dto.legal_status_id !== undefined)
          businessData.legal_status_id = Number(dto.legal_status_id);
        if (dto.location !== undefined) businessData.location = dto.location;
        if (dto.business_cover_image_url !== undefined)
          businessData.business_cover_image_url = dto.business_cover_image_url;
        if (dto.business_industry_name !== undefined)
          businessData.business_industry_name =
            dto.business_industry_name as business_industry;

        if (dto.business_employee_range !== undefined)
          businessData.business_employee_range = dto.business_employee_range;

        if (Object.keys(businessData).length > 0) {
          await tx.business_profiles.update({
            where: { user_id: userId },
            data: businessData,
          });
        }

        if (dto.business_tags !== undefined) {
          await tx.business_tags.deleteMany({ where: { business_id: userId } });
          if (dto.business_tags.length > 0) {
            await tx.business_tags.createMany({
              data: dto.business_tags.map((tagId) => ({
                business_id: userId,
                tag_id: Number(tagId),
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      await tx.users.update({
        where: { id: userId },
        data: { updated_at: new Date() },
      });
    });

    return this.getProfile(userId);
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
