import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { transaction_type, transaction_status } from '@prisma/client';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    create(createTransactionDto: CreateTransactionDto, user: RequestUser): Promise<{
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
    findAll(pagination: PaginationDto, user: RequestUser, transaction_type?: transaction_type, status?: transaction_status, currency?: string): Promise<{
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
    findOne(id: number, user: RequestUser): Promise<{
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
    processPayment(user: RequestUser, campaignId: number, creatorId: number, amount: number, description?: string): Promise<{
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
    getAccountBalance(user: RequestUser): Promise<{
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
    depositFunds(user: RequestUser, amount: number, currency?: string): Promise<{
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
    withdrawFunds(user: RequestUser, amount: number, currency?: string): Promise<{
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
    getStatistics(user: RequestUser): Promise<{
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
