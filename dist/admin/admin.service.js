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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const argon2 = require("argon2");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const [totalUsers, totalBusinesses, totalCreators, totalCampaigns, activeCampaigns, totalVideos, pendingVideos, totalTransactions, pendingTransactions,] = await Promise.all([
            this.prisma.users.count(),
            this.prisma.users.count({ where: { user_type: client_1.user_type.business } }),
            this.prisma.users.count({ where: { user_type: client_1.user_type.creator } }),
            this.prisma.campaigns.count(),
            this.prisma.campaigns.count({
                where: { status: client_1.campaign_status.active },
            }),
            this.prisma.campaign_videos.count(),
            this.prisma.campaign_videos.count({
                where: { status: client_1.video_status.under_review },
            }),
            this.prisma.transactions.count(),
            this.prisma.transactions.count({
                where: { status: client_1.transaction_status.pending },
            }),
        ]);
        return {
            users: {
                total: totalUsers,
                businesses: totalBusinesses,
                creators: totalCreators,
            },
            campaigns: {
                total: totalCampaigns,
                active: activeCampaigns,
            },
            videos: {
                total: totalVideos,
                pending: pendingVideos,
            },
            transactions: {
                total: totalTransactions,
                pending: pendingTransactions,
            },
        };
    }
    async getAllUsers(pagination, filters) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.user_type) {
            where.user_type = filters.user_type;
        }
        if (filters?.email_verified !== undefined) {
            where.email_verified = filters.email_verified;
        }
        const [users, total] = await Promise.all([
            this.prisma.users.findMany({
                where,
                skip,
                take: limit,
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
                        },
                    },
                    creator_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            nickname: true,
                            creator_type: true,
                            location: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            }),
            this.prisma.users.count({ where }),
        ]);
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
    }
    async getUserDetails(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                business_profiles: {
                    include: {
                        business_accounts: true,
                        campaigns: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                                budget: true,
                                created_at: true,
                            },
                            take: 5,
                            orderBy: { created_at: 'desc' },
                        },
                    },
                },
                creator_profiles: {
                    include: {
                        creator_accounts: true,
                        campaign_participants: {
                            include: {
                                campaigns: {
                                    select: {
                                        id: true,
                                        name: true,
                                        status: true,
                                    },
                                },
                            },
                            take: 5,
                            orderBy: { applied_at: 'desc' },
                        },
                        campaign_videos: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                created_at: true,
                            },
                            take: 5,
                            orderBy: { created_at: 'desc' },
                        },
                        social_media_accounts: true,
                    },
                },
                transactions: {
                    take: 10,
                    orderBy: { created_at: 'desc' },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async getAllCampaigns(pagination, filters) {
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
                            users: {
                                select: {
                                    email: true,
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
    async getAllTransactions(pagination, filters) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.transaction_type) {
            where.transaction_type = filters.transaction_type;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.user_id) {
            where.user_id = filters.user_id;
        }
        const [transactions, total] = await Promise.all([
            this.prisma.transactions.findMany({
                where,
                skip,
                take: limit,
                include: {
                    users: {
                        select: {
                            email: true,
                            user_type: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            }),
            this.prisma.transactions.count({ where }),
        ]);
        return {
            data: transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
    }
    async approveTransaction(transactionId) {
        const transaction = await this.prisma.transactions.findUnique({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== client_1.transaction_status.pending) {
            throw new common_1.ForbiddenException('Only pending transactions can be approved');
        }
        const updatedTransaction = await this.prisma.transactions.update({
            where: { id: transactionId },
            data: {
                status: client_1.transaction_status.completed,
                processed_at: new Date(),
            },
        });
        return {
            message: 'Transaction approved successfully',
            transaction: updatedTransaction,
        };
    }
    async rejectTransaction(transactionId, reason) {
        const transaction = await this.prisma.transactions.findUnique({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== client_1.transaction_status.pending) {
            throw new common_1.ForbiddenException('Only pending transactions can be rejected');
        }
        const updatedTransaction = await this.prisma.transactions.update({
            where: { id: transactionId },
            data: {
                status: client_1.transaction_status.failed,
                processed_at: new Date(),
                description: transaction.description +
                    (reason ? ` (Rejected: ${reason})` : ' (Rejected by admin)'),
            },
        });
        return {
            message: 'Transaction rejected successfully',
            transaction: updatedTransaction,
        };
    }
    async suspendUser(userId, reason) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.users.update({
            where: { id: userId },
            data: {
                email_verified: false,
            },
        });
        return {
            message: `User suspended successfully${reason ? `: ${reason}` : ''}`,
            user: updatedUser,
        };
    }
    async reactivateUser(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.users.update({
            where: { id: userId },
            data: {
                email_verified: true,
            },
        });
        return {
            message: 'User reactivated successfully',
            user: updatedUser,
        };
    }
    async getSystemAnalytics(startDate, endDate) {
        const start = startDate
            ? new Date(startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const [userRegistrations, campaignCreations, videoSubmissions, transactionVolume, platformUsage,] = await Promise.all([
            this.prisma.users.groupBy({
                by: ['user_type'],
                where: {
                    created_at: {
                        gte: start,
                        lte: end,
                    },
                },
                _count: true,
            }),
            this.prisma.campaigns.groupBy({
                by: ['status'],
                where: {
                    created_at: {
                        gte: start,
                        lte: end,
                    },
                },
                _count: true,
            }),
            this.prisma.campaign_videos.groupBy({
                by: ['status'],
                where: {
                    created_at: {
                        gte: start,
                        lte: end,
                    },
                },
                _count: true,
            }),
            this.prisma.transactions.aggregate({
                where: {
                    created_at: {
                        gte: start,
                        lte: end,
                    },
                    status: client_1.transaction_status.completed,
                },
                _sum: {
                    amount: true,
                },
                _count: true,
            }),
            this.prisma.social_media_accounts.groupBy({
                by: ['platform'],
                where: {
                    is_connected: true,
                },
                _count: true,
            }),
        ]);
        return {
            period: {
                start,
                end,
            },
            userRegistrations,
            campaignCreations,
            videoSubmissions,
            transactionVolume,
            platformUsage,
        };
    }
    async createAdmin(email, password, fullName, isSuperAdmin = false) {
        const existingAdmin = await this.prisma.admins.findUnique({
            where: { email },
        });
        if (existingAdmin) {
            throw new common_1.ForbiddenException('Admin with this email already exists');
        }
        const hashedPassword = await argon2.hash(password);
        const admin = await this.prisma.admins.create({
            data: {
                email,
                password_hash: hashedPassword,
                full_name: fullName,
                is_super_admin: isSuperAdmin,
            },
        });
        return {
            message: 'Admin created successfully',
            admin: {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name,
                is_super_admin: admin.is_super_admin,
            },
        };
    }
    async getAllAdmins() {
        const admins = await this.prisma.admins.findMany({
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                is_super_admin: true,
                created_at: true,
                last_login: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
        return admins;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map