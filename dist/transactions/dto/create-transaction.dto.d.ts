import { transaction_type } from '@prisma/client';
export declare class CreateTransactionDto {
    transaction_type: transaction_type;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
}
