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
exports.SocialMediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let SocialMediaService = class SocialMediaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async connectAccount(creatorId, connectDto) {
        const user = await this.prisma.users.findUnique({
            where: { id: creatorId },
            include: { creator_profiles: true },
        });
        if (!user || user.user_type !== client_1.user_type.creator) {
            throw new common_1.ForbiddenException('Only creators can connect social media accounts');
        }
        const existingAccount = await this.prisma.social_media_accounts.findUnique({
            where: {
                creator_id_platform: {
                    creator_id: creatorId,
                    platform: connectDto.platform,
                },
            },
        });
        if (existingAccount) {
            const updatedAccount = await this.prisma.social_media_accounts.update({
                where: { id: existingAccount.id },
                data: {
                    username: connectDto.username,
                    profile_url: connectDto.profile_url,
                    access_token: connectDto.access_token,
                    refresh_token: connectDto.refresh_token,
                    token_expires_at: connectDto.token_expires_at
                        ? new Date(connectDto.token_expires_at)
                        : null,
                    is_connected: true,
                    last_synced: new Date(),
                },
            });
            return {
                message: 'Social media account updated successfully',
                account: updatedAccount,
            };
        }
        else {
            const newAccount = await this.prisma.social_media_accounts.create({
                data: {
                    creator_id: creatorId,
                    platform: connectDto.platform,
                    username: connectDto.username,
                    profile_url: connectDto.profile_url,
                    access_token: connectDto.access_token,
                    refresh_token: connectDto.refresh_token,
                    token_expires_at: connectDto.token_expires_at
                        ? new Date(connectDto.token_expires_at)
                        : null,
                    is_connected: true,
                    last_synced: new Date(),
                },
            });
            return {
                message: 'Social media account connected successfully',
                account: newAccount,
            };
        }
    }
    async getConnectedAccounts(creatorId) {
        const user = await this.prisma.users.findUnique({
            where: { id: creatorId },
        });
        if (!user || user.user_type !== client_1.user_type.creator) {
            throw new common_1.ForbiddenException('Only creators can view social media accounts');
        }
        const accounts = await this.prisma.social_media_accounts.findMany({
            where: { creator_id: creatorId },
            select: {
                id: true,
                platform: true,
                username: true,
                profile_url: true,
                is_connected: true,
                last_synced: true,
                created_at: true,
                token_expires_at: true,
            },
            orderBy: {
                platform: 'asc',
            },
        });
        return accounts;
    }
    async disconnectAccount(creatorId, platform) {
        const account = await this.prisma.social_media_accounts.findUnique({
            where: {
                creator_id_platform: {
                    creator_id: creatorId,
                    platform,
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Social media account not found');
        }
        const updatedAccount = await this.prisma.social_media_accounts.update({
            where: { id: account.id },
            data: {
                is_connected: false,
                access_token: null,
                refresh_token: null,
                token_expires_at: null,
            },
        });
        return {
            message: 'Social media account disconnected successfully',
            account: updatedAccount,
        };
    }
    async refreshToken(creatorId, platform, newAccessToken, newRefreshToken, expiresAt) {
        const account = await this.prisma.social_media_accounts.findUnique({
            where: {
                creator_id_platform: {
                    creator_id: creatorId,
                    platform,
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Social media account not found');
        }
        const updatedAccount = await this.prisma.social_media_accounts.update({
            where: { id: account.id },
            data: {
                access_token: newAccessToken,
                refresh_token: newRefreshToken || account.refresh_token,
                token_expires_at: expiresAt
                    ? new Date(expiresAt)
                    : account.token_expires_at,
                last_synced: new Date(),
            },
        });
        return {
            message: 'Token refreshed successfully',
            account: updatedAccount,
        };
    }
    async syncAccountData(creatorId, platform, accountData) {
        const account = await this.prisma.social_media_accounts.findUnique({
            where: {
                creator_id_platform: {
                    creator_id: creatorId,
                    platform,
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Social media account not found');
        }
        if (!account.is_connected) {
            throw new common_1.BadRequestException('Account is not connected');
        }
        const updatedAccount = await this.prisma.social_media_accounts.update({
            where: { id: account.id },
            data: {
                username: accountData.username || account.username,
                profile_url: accountData.profile_url || account.profile_url,
                last_synced: new Date(),
            },
        });
        return {
            message: 'Account data synchronized successfully',
            account: updatedAccount,
        };
    }
    async getAccountAnalytics(creatorId, platform) {
        const where = { creator_id: creatorId };
        if (platform) {
            where.platform = platform;
        }
        const accounts = await this.prisma.social_media_accounts.findMany({
            where,
            select: {
                platform: true,
                username: true,
                is_connected: true,
            },
        });
        const videoAnalytics = await this.prisma.video_analytics.findMany({
            where: {
                ...(platform && { platform }),
                campaign_videos: {
                    creator_id: creatorId,
                },
            },
            include: {
                campaign_videos: {
                    select: {
                        title: true,
                        campaigns: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                snapshot_date: 'desc',
            },
        });
        const analyticsGrouped = videoAnalytics.reduce((acc, item) => {
            if (!acc[item.platform]) {
                acc[item.platform] = {
                    totalViews: 0,
                    totalClicks: 0,
                    totalEngagement: 0,
                    totalReach: 0,
                    totalEarnings: 0,
                    videos: [],
                };
            }
            acc[item.platform].totalViews += item.views || 0;
            acc[item.platform].totalClicks += item.clicks || 0;
            acc[item.platform].totalEngagement += item.engagement_count || 0;
            acc[item.platform].totalReach += item.reach || 0;
            acc[item.platform].totalEarnings +=
                item.earnings_amount?.toNumber() || 0;
            acc[item.platform].videos.push(item);
            return acc;
        }, {});
        return {
            connectedAccounts: accounts,
            analytics: analyticsGrouped,
        };
    }
    async getExpiringSoonTokens(daysBefore = 7) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysBefore);
        const accounts = await this.prisma.social_media_accounts.findMany({
            where: {
                is_connected: true,
                token_expires_at: {
                    lte: expirationDate,
                    gte: new Date(),
                },
            },
            include: {
                creator_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        users: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        return accounts;
    }
    async updateVideoSocialPost(videoId, platform, postUrl, platformPostId) {
        const video = await this.prisma.campaign_videos.findUnique({
            where: { id: videoId },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        const socialPost = await this.prisma.video_social_posts.upsert({
            where: {
                video_id_platform: {
                    video_id: videoId,
                    platform,
                },
            },
            update: {
                post_url: postUrl,
                platform_post_id: platformPostId,
                posted_at: new Date(),
            },
            create: {
                video_id: videoId,
                platform,
                post_url: postUrl,
                platform_post_id: platformPostId,
                posted_at: new Date(),
            },
        });
        await this.prisma.campaign_videos.update({
            where: { id: videoId },
            data: { posted_to_social: true },
        });
        return {
            message: 'Social post updated successfully',
            socialPost,
        };
    }
};
exports.SocialMediaService = SocialMediaService;
exports.SocialMediaService = SocialMediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SocialMediaService);
//# sourceMappingURL=social-media.service.js.map