import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { user_type } from '@prisma/client';
export declare class TransactionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: number, createTransactionDto: CreateTransactionDto): Promise<{
        description: string | null;
        id: number;
        created_at: Date | null;
        user_id: number | null;
        currency: string | null;
        status: import(".prisma/client").$Enums.transaction_status | null;
        transaction_type: import(".prisma/client").$Enums.transaction_type;
        amount: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        transaction_date: Date | null;
        processed_at: Date | null;
    }>;
    findAll(userId: number, pagination: PaginationDto, filters?: any): Promise<{
        data: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    findOne(id: number, userId: number): Promise<{
        users: {
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
        } | null;
    } & {
        description: string | null;
        id: number;
        created_at: Date | null;
        user_id: number | null;
        currency: string | null;
        status: import(".prisma/client").$Enums.transaction_status | null;
        transaction_type: import(".prisma/client").$Enums.transaction_type;
        amount: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        transaction_date: Date | null;
        processed_at: Date | null;
    }>;
    processPayment(campaignId: number, creatorId: number, businessId: number, amount: number, description?: string): Promise<{
        businessTransaction: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        };
        creatorTransaction: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        };
        message: string;
    }>;
    getAccountBalance(userId: number, userType: user_type): Promise<{
        id: number;
        currency: string | null;
        balance: import("@prisma/client/runtime/library").Decimal | null;
        business_id: number;
    }[] | {
        id: number;
        currency: string | null;
        available_balance: import("@prisma/client/runtime/library").Decimal | null;
        creator_id: number;
    }[]>;
    depositFunds(userId: number, amount: number, currency?: string): Promise<{
        message: string;
        transaction: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        };
    }>;
    withdrawFunds(userId: number, amount: number, currency?: string): Promise<{
        message: string;
        transaction: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        };
    }>;
    getTransactionStatistics(userId: number, userType: user_type): Promise<{
        totalTransactions: number;
        totalDeposits: number | import("@prisma/client/runtime/library").Decimal;
        totalWithdrawals: number;
        totalEarnings: number | import("@prisma/client/runtime/library").Decimal;
        recentTransactions: {
            description: string | null;
            id: number;
            created_at: Date | null;
            user_id: number | null;
            currency: string | null;
            status: import(".prisma/client").$Enums.transaction_status | null;
            transaction_type: import(".prisma/client").$Enums.transaction_type;
            amount: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transaction_date: Date | null;
            processed_at: Date | null;
        }[];
    }>;
}
