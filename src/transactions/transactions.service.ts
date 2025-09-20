import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  user_type,
  transaction_type,
  transaction_status,
} from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createTransactionDto: CreateTransactionDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        business_profiles: true,
        creator_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transaction = await this.prisma.transactions.create({
      data: {
        user_id: userId,
        ...createTransactionDto,
        transaction_date: new Date(),
        status: transaction_status.pending,
      },
    });

    return transaction;
  }

  async findAll(userId: number, pagination: PaginationDto, filters?: any) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };

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

  async findOne(id: number, userId: number) {
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
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.user_id !== userId) {
      throw new ForbiddenException('You can only view your own transactions');
    }

    return transaction;
  }

  async processPayment(
    campaignId: number,
    creatorId: number,
    businessId: number,
    amount: number,
    description?: string,
  ) {
    // Verify campaign ownership
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.business_id !== businessId) {
      throw new ForbiddenException(
        'You can only process payments for your own campaigns',
      );
    }

    // Get business account
    const businessAccount = await this.prisma.business_accounts.findFirst({
      where: { business_id: businessId },
    });

    if (!businessAccount) {
      throw new NotFoundException('Business account not found');
    }

    // Check if business has sufficient balance
    if (
      !businessAccount.balance ||
      businessAccount.balance.toNumber() < amount
    ) {
      throw new BadRequestException('Insufficient balance');
    }

    // Get creator account
    const creatorAccount = await this.prisma.creator_accounts.findFirst({
      where: { creator_id: creatorId },
    });

    if (!creatorAccount) {
      throw new NotFoundException('Creator account not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct from business account
      await tx.business_accounts.update({
        where: { id: businessAccount.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Add to creator account
      await tx.creator_accounts.update({
        where: { id: creatorAccount.id },
        data: {
          available_balance: {
            increment: amount,
          },
        },
      });

      // Create payment transaction for business (outgoing)
      const businessTransaction = await tx.transactions.create({
        data: {
          user_id: businessId,
          transaction_type: transaction_type.commission,
          amount: -amount,
          currency: businessAccount.currency || 'GEL',
          description:
            description || `Payment to creator for campaign ${campaignId}`,
          status: transaction_status.completed,
          transaction_date: new Date(),
          metadata: {
            campaign_id: campaignId,
            creator_id: creatorId,
            type: 'payment_sent',
          },
        },
      });

      // Create earning transaction for creator (incoming)
      const creatorTransaction = await tx.transactions.create({
        data: {
          user_id: creatorId,
          transaction_type: transaction_type.creator_earning,
          amount: amount,
          currency: creatorAccount.currency || 'GEL',
          description: description || `Earning from campaign ${campaignId}`,
          status: transaction_status.completed,
          transaction_date: new Date(),
          metadata: {
            campaign_id: campaignId,
            business_id: businessId,
            type: 'payment_received',
          },
        },
      });

      // Update campaign budget tracking
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

  async getAccountBalance(userId: number, userType: user_type) {
    if (userType === user_type.business) {
      const accounts = await this.prisma.business_accounts.findMany({
        where: { business_id: userId },
      });
      return accounts;
    } else if (userType === user_type.creator) {
      const accounts = await this.prisma.creator_accounts.findMany({
        where: { creator_id: userId },
      });
      return accounts;
    }

    throw new BadRequestException('Invalid user type');
  }

  async depositFunds(userId: number, amount: number, currency = 'GEL') {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.user_type !== user_type.business) {
      throw new ForbiddenException('Only business users can deposit funds');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update business account balance
      const account = await tx.business_accounts.findFirst({
        where: { business_id: userId, currency },
      });

      if (!account) {
        throw new NotFoundException('Account not found for this currency');
      }

      await tx.business_accounts.update({
        where: { id: account.id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Create deposit transaction
      const transaction = await tx.transactions.create({
        data: {
          user_id: userId,
          transaction_type: transaction_type.deposit,
          amount,
          currency,
          description: `Deposit of ${amount} ${currency}`,
          status: transaction_status.completed,
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

  async withdrawFunds(userId: number, amount: number, currency = 'GEL') {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.user_type !== user_type.creator) {
      throw new ForbiddenException('Only creators can withdraw funds');
    }

    const account = await this.prisma.creator_accounts.findFirst({
      where: { creator_id: userId, currency },
    });

    if (!account) {
      throw new NotFoundException('Account not found for this currency');
    }

    if (
      !account.available_balance ||
      account.available_balance.toNumber() < amount
    ) {
      throw new BadRequestException('Insufficient balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update creator account balance
      await tx.creator_accounts.update({
        where: { id: account.id },
        data: {
          available_balance: {
            decrement: amount,
          },
        },
      });

      // Create withdrawal transaction
      const transaction = await tx.transactions.create({
        data: {
          user_id: userId,
          transaction_type: transaction_type.withdrawal,
          amount: -amount,
          currency,
          description: `Withdrawal of ${amount} ${currency}`,
          status: transaction_status.pending, // Withdrawals need approval
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

  async getTransactionStatistics(userId: number, userType: user_type) {
    const where = { user_id: userId };

    const [
      totalTransactions,
      totalDeposits,
      totalWithdrawals,
      totalEarnings,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.transactions.count({ where }),
      this.prisma.transactions.aggregate({
        where: {
          ...where,
          transaction_type: transaction_type.deposit,
          status: transaction_status.completed,
        },
        _sum: { amount: true },
      }),
      this.prisma.transactions.aggregate({
        where: {
          ...where,
          transaction_type: transaction_type.withdrawal,
          status: transaction_status.completed,
        },
        _sum: { amount: true },
      }),
      this.prisma.transactions.aggregate({
        where: {
          ...where,
          transaction_type: transaction_type.creator_earning,
          status: transaction_status.completed,
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
}
