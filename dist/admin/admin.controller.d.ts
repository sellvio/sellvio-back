import { AdminService } from './admin.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { user_type, campaign_status, transaction_type, transaction_status } from '@prisma/client';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboardStats(): Promise<{
        users: {
            total: number;
            businesses: number;
            creators: number;
        };
        campaigns: {
            total: number;
            active: number;
        };
        videos: {
            total: number;
            pending: number;
        };
        transactions: {
            total: number;
            pending: number;
        };
    }>;
    getAllUsers(pagination: PaginationDto, user_type?: user_type, email_verified?: boolean): Promise<{
        data: {
            business_profiles: {
                company_name: string;
                business_email: string | null;
                phone: string | null;
            } | null;
            creator_profiles: {
                creator_type: import(".prisma/client").$Enums.creator_type | null;
                first_name: string;
                last_name: string;
                nickname: string | null;
                location: string;
            } | null;
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
            id: number;
            email_verified: boolean | null;
            created_at: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    getUserDetails(id: number): Promise<{
        business_profiles: ({
            business_accounts: {
                id: number;
                currency: string | null;
                balance: import("@prisma/client/runtime/library").Decimal | null;
                business_id: number;
            }[];
            campaigns: {
                name: string;
                id: number;
                created_at: Date | null;
                budget: import("@prisma/client/runtime/library").Decimal;
                status: import(".prisma/client").$Enums.campaign_status | null;
            }[];
        } & {
            description: string | null;
            company_name: string;
            website_url: string | null;
            business_email: string | null;
            phone: string | null;
            created_at: Date | null;
            updated_at: Date | null;
            user_id: number;
            logo_url: string | null;
            max_tags_allowed: number | null;
            business_employee_range: string | null;
        }) | null;
        creator_profiles: ({
            campaign_participants: ({
                campaigns: {
                    name: string;
                    id: number;
                    status: import(".prisma/client").$Enums.campaign_status | null;
                };
            } & {
                id: number;
                creator_id: number;
                status: import(".prisma/client").$Enums.participation_status | null;
                campaign_id: number;
                applied_at: Date | null;
                approved_at: Date | null;
                approved_by: number | null;
                rejection_reason: string | null;
            })[];
            campaign_videos: {
                title: string;
                id: number;
                created_at: Date | null;
                status: import(".prisma/client").$Enums.video_status | null;
            }[];
            creator_accounts: {
                id: number;
                currency: string | null;
                available_balance: import("@prisma/client/runtime/library").Decimal | null;
                creator_id: number;
            }[];
            social_media_accounts: {
                id: number;
                created_at: Date | null;
                creator_id: number;
                access_token: string | null;
                platform: import(".prisma/client").$Enums.social_platform;
                username: string | null;
                profile_url: string | null;
                refresh_token: string | null;
                token_expires_at: Date | null;
                is_connected: boolean | null;
                last_synced: Date | null;
            }[];
        } & {
            creator_type: import(".prisma/client").$Enums.creator_type | null;
            first_name: string;
            last_name: string;
            nickname: string | null;
            location: string;
            phone: string | null;
            created_at: Date | null;
            updated_at: Date | null;
            user_id: number;
            max_tags_allowed: number | null;
            date_of_birth: Date | null;
            bio: string | null;
            profile_image_url: string | null;
        }) | null;
        transactions: {
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
    } & {
        email: string;
        user_type: import(".prisma/client").$Enums.user_type | null;
        id: number;
        password_hash: string;
        email_verified: boolean | null;
        email_verified_at: Date | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    getAllCampaigns(pagination: PaginationDto, status?: campaign_status, business_id?: number): Promise<{
        data: ({
            business_profiles: {
                users: {
                    email: string;
                };
                company_name: string;
            };
            _count: {
                campaign_participants: number;
                campaign_videos: number;
            };
        } & {
            name: string;
            description: string | null;
            id: number;
            created_at: Date | null;
            updated_at: Date | null;
            business_id: number;
            budget: import("@prisma/client/runtime/library").Decimal;
            budget_hidden: boolean | null;
            duration_days: number;
            finish_date: Date;
            status: import(".prisma/client").$Enums.campaign_status | null;
            chat_type: import(".prisma/client").$Enums.chat_type | null;
            target_creator_types: import(".prisma/client").$Enums.creator_type[];
            additional_requirements: string | null;
            payment_type: import(".prisma/client").$Enums.payment_type;
            payment_amount: import("@prisma/client/runtime/library").Decimal;
            payment_per_quantity: number;
            requirements: string;
            target_audience: string | null;
            campaign_image_url: string | null;
            start_date: Date | null;
            end_date: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    getAllTransactions(pagination: PaginationDto, transaction_type?: transaction_type, status?: transaction_status, user_id?: number): Promise<{
        data: ({
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
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    approveTransaction(id: number): Promise<{
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
    rejectTransaction(id: number, reason?: string): Promise<{
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
    suspendUser(id: number, reason?: string): Promise<{
        message: string;
        user: {
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
            id: number;
            password_hash: string;
            email_verified: boolean | null;
            email_verified_at: Date | null;
            created_at: Date | null;
            updated_at: Date | null;
        };
    }>;
    reactivateUser(id: number): Promise<{
        message: string;
        user: {
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
            id: number;
            password_hash: string;
            email_verified: boolean | null;
            email_verified_at: Date | null;
            created_at: Date | null;
            updated_at: Date | null;
        };
    }>;
    getSystemAnalytics(startDate?: string, endDate?: string): Promise<{
        period: {
            start: Date;
            end: Date;
        };
        userRegistrations: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.UsersGroupByOutputType, "user_type"[]> & {
            _count: number;
        })[];
        campaignCreations: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.CampaignsGroupByOutputType, "status"[]> & {
            _count: number;
        })[];
        videoSubmissions: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.Campaign_videosGroupByOutputType, "status"[]> & {
            _count: number;
        })[];
        transactionVolume: import(".prisma/client").Prisma.GetTransactionsAggregateType<{
            where: {
                created_at: {
                    gte: Date;
                    lte: Date;
                };
                status: "completed";
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        platformUsage: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.Social_media_accountsGroupByOutputType, "platform"[]> & {
            _count: number;
        })[];
    }>;
    createAdmin(email: string, password: string, fullName: string, isSuperAdmin?: boolean): Promise<{
        message: string;
        admin: {
            id: number;
            email: string;
            full_name: string;
            is_super_admin: boolean | null;
        };
    }>;
    getAllAdmins(): Promise<{
        email: string;
        id: number;
        created_at: Date | null;
        full_name: string;
        role: string | null;
        is_super_admin: boolean | null;
        last_login: Date | null;
    }[]>;
}
