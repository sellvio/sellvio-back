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
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let VideosService = class VideosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(campaignId, creatorId, createVideoDto) {
        const participation = await this.prisma.campaign_participants.findUnique({
            where: {
                campaign_id_creator_id: {
                    campaign_id: campaignId,
                    creator_id: creatorId,
                },
            },
            include: {
                campaigns: true,
            },
        });
        if (!participation) {
            throw new common_1.ForbiddenException('You are not participating in this campaign');
        }
        if (participation.status !== client_1.participation_status.approved) {
            throw new common_1.ForbiddenException('You must be approved to submit videos');
        }
        if (participation.campaigns.status !== 'active') {
            throw new common_1.BadRequestException('Campaign is not active');
        }
        const video = await this.prisma.campaign_videos.create({
            data: {
                campaign_id: campaignId,
                creator_id: creatorId,
                ...createVideoDto,
                submitted_at: new Date(),
            },
            include: {
                campaigns: {
                    select: {
                        name: true,
                    },
                },
                creator_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        nickname: true,
                    },
                },
            },
        });
        return video;
    }
    async findAll(pagination, filters) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.campaign_id) {
            where.campaign_id = filters.campaign_id;
        }
        if (filters?.creator_id) {
            where.creator_id = filters.creator_id;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        const [videos, total] = await Promise.all([
            this.prisma.campaign_videos.findMany({
                where,
                skip,
                take: limit,
                include: {
                    campaigns: {
                        select: {
                            name: true,
                            business_profiles: {
                                select: {
                                    company_name: true,
                                },
                            },
                        },
                    },
                    creator_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            nickname: true,
                            profile_image_url: true,
                        },
                    },
                    video_analytics: {
                        select: {
                            platform: true,
                            views: true,
                            clicks: true,
                            engagement_count: true,
                            reach: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            }),
            this.prisma.campaign_videos.count({ where }),
        ]);
        return {
            data: videos,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
    }
    async findOne(id) {
        const video = await this.prisma.campaign_videos.findUnique({
            where: { id },
            include: {
                campaigns: {
                    select: {
                        id: true,
                        name: true,
                        business_id: true,
                        business_profiles: {
                            select: {
                                company_name: true,
                                logo_url: true,
                            },
                        },
                    },
                },
                creator_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        nickname: true,
                        profile_image_url: true,
                    },
                },
                video_analytics: {
                    select: {
                        platform: true,
                        views: true,
                        clicks: true,
                        engagement_count: true,
                        reach: true,
                        earnings_amount: true,
                        snapshot_date: true,
                    },
                    orderBy: {
                        snapshot_date: 'desc',
                    },
                },
                video_social_posts: {
                    select: {
                        platform: true,
                        post_url: true,
                        posted_at: true,
                    },
                },
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        return video;
    }
    async review(id, reviewerId, reviewVideoDto) {
        const video = await this.prisma.campaign_videos.findUnique({
            where: { id },
            include: {
                campaigns: true,
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        if (video.campaigns.business_id !== reviewerId) {
            throw new common_1.ForbiddenException('You can only review videos for your own campaigns');
        }
        const updatedVideo = await this.prisma.campaign_videos.update({
            where: { id },
            data: {
                status: reviewVideoDto.status,
                review_comments: reviewVideoDto.review_comments,
                reviewed_at: new Date(),
                reviewed_by: reviewerId,
            },
            include: {
                campaigns: {
                    select: {
                        name: true,
                    },
                },
                creator_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        nickname: true,
                    },
                },
            },
        });
        return updatedVideo;
    }
    async remove(id, userId, userType) {
        const video = await this.prisma.campaign_videos.findUnique({
            where: { id },
            include: {
                campaigns: true,
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        const canDelete = (userType === client_1.user_type.creator && video.creator_id === userId) ||
            (userType === client_1.user_type.business &&
                video.campaigns.business_id === userId);
        if (!canDelete) {
            throw new common_1.ForbiddenException('You cannot delete this video');
        }
        if (video.status === client_1.video_status.approved && video.posted_to_social) {
            throw new common_1.BadRequestException('Cannot delete videos that have been posted to social media');
        }
        await this.prisma.campaign_videos.delete({
            where: { id },
        });
        return { message: 'Video deleted successfully' };
    }
    async getVideoAnalytics(id) {
        const video = await this.prisma.campaign_videos.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                campaigns: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        const analytics = await this.prisma.video_analytics.findMany({
            where: { video_id: id },
            orderBy: [{ platform: 'asc' }, { snapshot_date: 'desc' }],
        });
        const analyticsGrouped = analytics.reduce((acc, item) => {
            if (!acc[item.platform]) {
                acc[item.platform] = [];
            }
            acc[item.platform].push(item);
            return acc;
        }, {});
        return {
            video,
            analytics: analyticsGrouped,
        };
    }
    async updateSocialPost(videoId, platform, postUrl, platformPostId) {
        await this.prisma.video_social_posts.upsert({
            where: {
                video_id_platform: {
                    video_id: videoId,
                    platform: platform,
                },
            },
            update: {
                post_url: postUrl,
                platform_post_id: platformPostId,
                posted_at: new Date(),
            },
            create: {
                video_id: videoId,
                platform: platform,
                post_url: postUrl,
                platform_post_id: platformPostId,
                posted_at: new Date(),
            },
        });
        await this.prisma.campaign_videos.update({
            where: { id: videoId },
            data: { posted_to_social: true },
        });
        return { message: 'Social post updated successfully' };
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VideosService);
//# sourceMappingURL=videos.service.js.map