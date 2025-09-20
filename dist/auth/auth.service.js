"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const argon2 = require("argon2");
const crypto = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    jwtService;
    emailService;
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { email, password, user_type: userType, ...profileData } = registerDto;
        const existingUser = await this.prisma.users.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await argon2.hash(password);
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: email.toLowerCase().trim(),
                    password_hash: hashedPassword,
                    user_type: userType,
                },
            });
            if (userType === client_1.user_type.business) {
                if (!profileData.company_name) {
                    throw new common_1.BadRequestException('Company name is required for business accounts');
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
                await tx.business_accounts.create({
                    data: {
                        business_id: user.id,
                        currency: 'GEL',
                        balance: 0.0,
                    },
                });
            }
            else if (userType === client_1.user_type.creator) {
                if (!profileData.first_name ||
                    !profileData.last_name ||
                    !profileData.location) {
                    throw new common_1.BadRequestException('First name, last name, and location are required for creator accounts');
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
        await this.sendVerificationEmail(result);
        const token = this.generateToken(result);
        return {
            access_token: token,
            user: {
                id: result.id,
                email: result.email,
                user_type: result.user_type,
                email_verified: result.email_verified,
            },
        };
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = this.generateToken(user);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                email_verified: user.email_verified,
            },
        };
    }
    async validateUser(email, password) {
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
    generateToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            user_type: user.user_type,
        };
        return this.jwtService.sign(payload);
    }
    async getProfile(userId) {
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
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async sendVerificationEmail(user) {
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            await this.prisma.email_verification_tokens.create({
                data: {
                    user_id: user.id,
                    token,
                    expires_at: expiresAt,
                },
            });
            let userName = user.email.split('@')[0];
            if (user.user_type === client_1.user_type.business) {
                const profile = await this.prisma.business_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.company_name || userName;
            }
            else if (user.user_type === client_1.user_type.creator) {
                const profile = await this.prisma.creator_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.first_name || userName;
            }
            await this.emailService.sendVerificationEmail(user.email, token, userName);
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
        }
    }
    async verifyEmail(token) {
        const verificationToken = await this.prisma.email_verification_tokens.findFirst({
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
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
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
        await this.sendWelcomeEmail(verificationToken.users);
        return {
            success: true,
            message: 'Email verified successfully',
        };
    }
    async resendVerificationEmail(email) {
        const user = await this.prisma.users.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            return {
                success: true,
                message: 'If the email exists and is not verified, a verification email has been sent',
            };
        }
        if (user.email_verified) {
            throw new common_1.BadRequestException('Email is already verified');
        }
        await this.prisma.email_verification_tokens.updateMany({
            where: {
                user_id: user.id,
                used_at: null,
            },
            data: {
                used_at: new Date(),
            },
        });
        await this.sendVerificationEmail(user);
        return {
            success: true,
            message: 'Verification email sent successfully',
        };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.users.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.email_verified) {
            return {
                success: true,
                message: 'If the email exists and is verified, a password reset email has been sent',
            };
        }
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            await this.prisma.password_reset_tokens.updateMany({
                where: {
                    user_id: user.id,
                    used_at: null,
                },
                data: {
                    used_at: new Date(),
                },
            });
            await this.prisma.password_reset_tokens.create({
                data: {
                    user_id: user.id,
                    token,
                    expires_at: expiresAt,
                },
            });
            let userName = user.email.split('@')[0];
            if (user.user_type === client_1.user_type.business) {
                const profile = await this.prisma.business_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.company_name || userName;
            }
            else if (user.user_type === client_1.user_type.creator) {
                const profile = await this.prisma.creator_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.first_name || userName;
            }
            await this.emailService.sendPasswordResetEmail(user.email, token, userName);
        }
        catch (error) {
            console.error('Failed to send password reset email:', error);
        }
        return {
            success: true,
            message: 'If the email exists and is verified, a password reset email has been sent',
        };
    }
    async resetPassword(token, newPassword) {
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
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await argon2.hash(newPassword);
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
    async sendWelcomeEmail(user) {
        try {
            let userName = user.email.split('@')[0];
            if (user.user_type === client_1.user_type.business) {
                const profile = await this.prisma.business_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.company_name || userName;
            }
            else if (user.user_type === client_1.user_type.creator) {
                const profile = await this.prisma.creator_profiles.findUnique({
                    where: { user_id: user.id },
                });
                userName = profile?.first_name || userName;
            }
            await this.emailService.sendWelcomeEmail(user.email, userName, user.user_type);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map