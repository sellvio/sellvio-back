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
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CampaignsService = class CampaignsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(businessId, createCampaignDto) {
        const { platforms, tags, ...campaignData } = createCampaignDto;
        const user = await this.prisma.users.findUnique({
            where: { id: businessId },
            include: { business_profiles: true },
        });
        if (!user || user.user_type !== client_1.user_type.business) {
            throw new common_1.ForbiddenException('Only business users can create campaigns');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const campaign = await tx.campaigns.create({
                data: {
                    business_id: businessId,
                    ...campaignData,
                    start_date: new Date(),
                },
            });
            if (platforms && platforms.length > 0) {
                await tx.campaign_platforms.createMany({
                    data: platforms.map((platform) => ({
                        campaign_id: campaign.id,
                        platform,
                    })),
                });
            }
            if (tags && tags.length > 0) {
                for (const tagName of tags) {
                    const tag = await tx.tags.upsert({
                        where: { name: tagName },
                        update: {},
                        create: { name: tagName },
                    });
                    await tx.campaign_tags.create({
                        data: {
                            campaign_id: campaign.id,
                            tag_id: tag.id,
                        },
                    });
                }
            }
            await tx.campaign_budget_tracking.create({
                data: {
                    campaign_id: campaign.id,
                    total_budget: campaignData.budget,
                    spent_amount: 0,
                },
            });
            return campaign;
        });
        return this.findOne(result.id);
    }
    async findAll(pagination, filters) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.business_id) {
            where.business_id = filters.business_id;
        }
        const [campaigns, total] = await Promise.all([
            this.prisma.campaigns.findMany({
                where,
                skip,
                take: limit,
                include: {
                    business_profiles: {
                        select: {
                            company_name: true,
                            logo_url: true,
                        },
                    },
                    campaign_platforms: {
                        select: {
                            platform: true,
                        },
                    },
                    campaign_tags: {
                        include: {
                            tags: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            campaign_participants: true,
                            campaign_videos: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            }),
            this.prisma.campaigns.count({ where }),
        ]);
        return {
            data: campaigns,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
    }
    async findOne(id) {
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id },
            include: {
                business_profiles: {
                    select: {
                        company_name: true,
                        logo_url: true,
                        business_email: true,
                    },
                },
                campaign_platforms: {
                    select: {
                        platform: true,
                    },
                },
                campaign_tags: {
                    include: {
                        tags: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                campaign_budget_tracking: true,
                campaign_participants: {
                    include: {
                        creator_profiles: {
                            select: {
                                first_name: true,
                                last_name: true,
                                nickname: true,
                                profile_image_url: true,
                            },
                        },
                    },
                },
                campaign_videos: {
                    where: {
                        status: 'approved',
                    },
                    select: {
                        id: true,
                        title: true,
                        cover_url: true,
                        created_at: true,
                    },
                },
                _count: {
                    select: {
                        campaign_participants: true,
                        campaign_videos: true,
                    },
                },
            },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        return campaign;
    }
    async update(id, userId, updateCampaignDto) {
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.business_id !== userId) {
            throw new common_1.ForbiddenException('You can only update your own campaigns');
        }
        const { platforms, tags, ...campaignData } = updateCampaignDto;
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedCampaign = await tx.campaigns.update({
                where: { id },
                data: campaignData,
            });
            if (platforms !== undefined) {
                await tx.campaign_platforms.deleteMany({
                    where: { campaign_id: id },
                });
                if (platforms.length > 0) {
                    await tx.campaign_platforms.createMany({
                        data: platforms.map((platform) => ({
                            campaign_id: id,
                            platform,
                        })),
                    });
                }
            }
            if (tags !== undefined) {
                await tx.campaign_tags.deleteMany({
                    where: { campaign_id: id },
                });
                if (tags.length > 0) {
                    for (const tagName of tags) {
                        const tag = await tx.tags.upsert({
                            where: { name: tagName },
                            update: {},
                            create: { name: tagName },
                        });
                        await tx.campaign_tags.create({
                            data: {
                                campaign_id: id,
                                tag_id: tag.id,
                            },
                        });
                    }
                }
            }
            return updatedCampaign;
        });
        return this.findOne(id);
    }
    async remove(id, userId) {
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.business_id !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own campaigns');
        }
        if (campaign.status === client_1.campaign_status.active) {
            throw new common_1.BadRequestException('Cannot delete active campaigns');
        }
        await this.prisma.campaigns.delete({
            where: { id },
        });
        return { message: 'Campaign deleted successfully' };
    }
    async participate(campaignId, creatorId) {
        const user = await this.prisma.users.findUnique({
            where: { id: creatorId },
            include: { creator_profiles: true },
        });
        if (!user || user.user_type !== client_1.user_type.creator) {
            throw new common_1.ForbiddenException('Only creators can participate in campaigns');
        }
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id: campaignId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.status !== client_1.campaign_status.active) {
            throw new common_1.BadRequestException('Campaign is not accepting participants');
        }
        const existingParticipation = await this.prisma.campaign_participants.findUnique({
            where: {
                campaign_id_creator_id: {
                    campaign_id: campaignId,
                    creator_id: creatorId,
                },
            },
        });
        if (existingParticipation) {
            throw new common_1.BadRequestException('Already participating in this campaign');
        }
        const participation = await this.prisma.campaign_participants.create({
            data: {
                campaign_id: campaignId,
                creator_id: creatorId,
                status: client_1.participation_status.pending,
            },
            include: {
                campaigns: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return {
            message: 'Successfully applied to participate in campaign',
            participation,
        };
    }
    async updateParticipationStatus(campaignId, creatorId, businessId, status, rejectionReason) {
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id: campaignId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.business_id !== businessId) {
            throw new common_1.ForbiddenException('You can only manage your own campaigns');
        }
        const participation = await this.prisma.campaign_participants.findUnique({
            where: {
                campaign_id_creator_id: {
                    campaign_id: campaignId,
                    creator_id: creatorId,
                },
            },
        });
        if (!participation) {
            throw new common_1.NotFoundException('Participation not found');
        }
        const updatedParticipation = await this.prisma.campaign_participants.update({
            where: {
                campaign_id_creator_id: {
                    campaign_id: campaignId,
                    creator_id: creatorId,
                },
            },
            data: {
                status,
                approved_at: status === client_1.participation_status.approved ? new Date() : null,
                approved_by: status === client_1.participation_status.approved ? businessId : null,
                rejection_reason: status === client_1.participation_status.rejected ? rejectionReason : null,
            },
            include: {
                creator_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        nickname: true,
                    },
                },
            },
        });
        return updatedParticipation;
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map