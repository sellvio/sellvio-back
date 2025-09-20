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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TransactionsService = class TransactionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createTransactionDto) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                business_profiles: true,
                creator_profiles: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const transaction = await this.prisma.transactions.create({
            data: {
                user_id: userId,
                ...createTransactionDto,
                transaction_date: new Date(),
                status: client_1.transaction_status.pending,
            },
        });
        return transaction;
    }
    async findAll(userId, pagination, filters) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = { user_id: userId };
        if (filters?.transaction_type) {
            where.transaction_type = filters.transaction_type;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.currency) {
            where.currency = filters.currency;
        }
        const [transactions, total] = await Promise.all([
            this.prisma.transactions.findMany({
                where,
                skip,
                take: limit,
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
    async findOne(id, userId) {
        const transaction = await this.prisma.transactions.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        email: true,
                        user_type: true,
                    },
                },
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.user_id !== userId) {
            throw new common_1.ForbiddenException('You can only view your own transactions');
        }
        return transaction;
    }
    async processPayment(campaignId, creatorId, businessId, amount, description) {
        const campaign = await this.prisma.campaigns.findUnique({
            where: { id: campaignId },
        });
        if (!campaign || campaign.business_id !== businessId) {
            throw new common_1.ForbiddenException('You can only process payments for your own campaigns');
        }
        const businessAccount = await this.prisma.business_accounts.findFirst({
            where: { business_id: businessId },
        });
        if (!businessAccount) {
            throw new common_1.NotFoundException('Business account not found');
        }
        if (!businessAccount.balance ||
            businessAccount.balance.toNumber() < amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const creatorAccount = await this.prisma.creator_accounts.findFirst({
            where: { creator_id: creatorId },
        });
        if (!creatorAccount) {
            throw new common_1.NotFoundException('Creator account not found');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.business_accounts.update({
                where: { id: businessAccount.id },
                data: {
                    balance: {
                        decrement: amount,
                    },
                },
            });
            await tx.creator_accounts.update({
                where: { id: creatorAccount.id },
                data: {
                    available_balance: {
                        increment: amount,
                    },
                },
            });
            const businessTransaction = await tx.transactions.create({
                data: {
                    user_id: businessId,
                    transaction_type: client_1.transaction_type.commission,
                    amount: -amount,
                    currency: businessAccount.currency || 'GEL',
                    description: description || `Payment to creator for campaign ${campaignId}`,
                    status: client_1.transaction_status.completed,
                    transaction_date: new Date(),
                    metadata: {
                        campaign_id: campaignId,
                        creator_id: creatorId,
                        type: 'payment_sent',
                    },
                },
            });
            const creatorTransaction = await tx.transactions.create({
                data: {
                    user_id: creatorId,
                    transaction_type: client_1.transaction_type.creator_earning,
                    amount: amount,
                    currency: creatorAccount.currency || 'GEL',
                    description: description || `Earning from campaign ${campaignId}`,
                    status: client_1.transaction_status.completed,
                    transaction_date: new Date(),
                    metadata: {
                        campaign_id: campaignId,
                        business_id: businessId,
                        type: 'payment_received',
                    },
                },
            });
            await tx.campaign_budget_tracking.updateMany({
                where: { campaign_id: campaignId },
                data: {
                    spent_amount: {
                        increment: amount,
                    },
                },
            });
            return {
                businessTransaction,
                creatorTransaction,
            };
        });
        return {
            message: 'Payment processed successfully',
            ...result,
        };
    }
    async getAccountBalance(userId, userType) {
        if (userType === client_1.user_type.business) {
            const accounts = await this.prisma.business_accounts.findMany({
                where: { business_id: userId },
            });
            return accounts;
        }
        else if (userType === client_1.user_type.creator) {
            const accounts = await this.prisma.creator_accounts.findMany({
                where: { creator_id: userId },
            });
            return accounts;
        }
        throw new common_1.BadRequestException('Invalid user type');
    }
    async depositFunds(userId, amount, currency = 'GEL') {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.user_type !== client_1.user_type.business) {
            throw new common_1.ForbiddenException('Only business users can deposit funds');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const account = await tx.business_accounts.findFirst({
                where: { business_id: userId, currency },
            });
            if (!account) {
                throw new common_1.NotFoundException('Account not found for this currency');
            }
            await tx.business_accounts.update({
                where: { id: account.id },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });
            const transaction = await tx.transactions.create({
                data: {
                    user_id: userId,
                    transaction_type: client_1.transaction_type.deposit,
                    amount,
                    currency,
                    description: `Deposit of ${amount} ${currency}`,
                    status: client_1.transaction_status.completed,
                    transaction_date: new Date(),
                },
            });
            return transaction;
        });
        return {
            message: 'Funds deposited successfully',
            transaction: result,
        };
    }
    async withdrawFunds(userId, amount, currency = 'GEL') {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.user_type !== client_1.user_type.creator) {
            throw new common_1.ForbiddenException('Only creators can withdraw funds');
        }
        const account = await this.prisma.creator_accounts.findFirst({
            where: { creator_id: userId, currency },
        });
        if (!account) {
            throw new common_1.NotFoundException('Account not found for this currency');
        }
        if (!account.available_balance ||
            account.available_balance.toNumber() < amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.creator_accounts.update({
                where: { id: account.id },
                data: {
                    available_balance: {
                        decrement: amount,
                    },
                },
            });
            const transaction = await tx.transactions.create({
                data: {
                    user_id: userId,
                    transaction_type: client_1.transaction_type.withdrawal,
                    amount: -amount,
                    currency,
                    description: `Withdrawal of ${amount} ${currency}`,
                    status: client_1.transaction_status.pending,
                    transaction_date: new Date(),
                },
            });
            return transaction;
        });
        return {
            message: 'Withdrawal request submitted successfully',
            transaction: result,
        };
    }
    async getTransactionStatistics(userId, userType) {
        const where = { user_id: userId };
        const [totalTransactions, totalDeposits, totalWithdrawals, totalEarnings, recentTransactions,] = await Promise.all([
            this.prisma.transactions.count({ where }),
            this.prisma.transactions.aggregate({
                where: {
                    ...where,
                    transaction_type: client_1.transaction_type.deposit,
                    status: client_1.transaction_status.completed,
                },
                _sum: { amount: true },
            }),
            this.prisma.transactions.aggregate({
                where: {
                    ...where,
                    transaction_type: client_1.transaction_type.withdrawal,
                    status: client_1.transaction_status.completed,
                },
                _sum: { amount: true },
            }),
            this.prisma.transactions.aggregate({
                where: {
                    ...where,
                    transaction_type: client_1.transaction_type.creator_earning,
                    status: client_1.transaction_status.completed,
                },
                _sum: { amount: true },
            }),
            this.prisma.transactions.findMany({
                where,
                take: 5,
                orderBy: { created_at: 'desc' },
            }),
        ]);
        return {
            totalTransactions,
            totalDeposits: totalDeposits._sum.amount || 0,
            totalWithdrawals: Math.abs(totalWithdrawals._sum.amount?.toNumber() || 0),
            totalEarnings: totalEarnings._sum.amount || 0,
            recentTransactions,
        };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map