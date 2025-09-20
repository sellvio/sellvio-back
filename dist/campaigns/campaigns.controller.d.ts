import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { campaign_status, participation_status } from '@prisma/client';
export declare class CampaignsController {
    private readonly campaignsService;
    constructor(campaignsService: CampaignsService);
    create(createCampaignDto: CreateCampaignDto, user: RequestUser): Promise<{
        business_profiles: {
            company_name: string;
            business_email: string | null;
            logo_url: string | null;
        };
        campaign_budget_tracking: {
            id: number;
            campaign_id: number;
            total_budget: import("@prisma/client/runtime/library").Decimal;
            spent_amount: import("@prisma/client/runtime/library").Decimal | null;
            remaining_budget: import("@prisma/client/runtime/library").Decimal | null;
            last_updated: Date | null;
        }[];
        campaign_participants: ({
            creator_profiles: {
                first_name: string;
                last_name: string;
                nickname: string | null;
                profile_image_url: string | null;
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
        campaign_platforms: {
            platform: import(".prisma/client").$Enums.social_platform;
        }[];
        campaign_tags: ({
            tags: {
                name: string;
            };
        } & {
            campaign_id: number;
            tag_id: number;
        })[];
        campaign_videos: {
            title: string;
            id: number;
            created_at: Date | null;
            cover_url: string | null;
        }[];
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
    }>;
    findAll(pagination: PaginationDto, status?: campaign_status, business_id?: number): Promise<{
        data: ({
            business_profiles: {
                company_name: string;
                logo_url: string | null;
            };
            campaign_platforms: {
                platform: import(".prisma/client").$Enums.social_platform;
            }[];
            campaign_tags: ({
                tags: {
                    name: string;
                };
            } & {
                campaign_id: number;
                tag_id: number;
            })[];
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
    findOne(id: number): Promise<{
        business_profiles: {
            company_name: string;
            business_email: string | null;
            logo_url: string | null;
        };
        campaign_budget_tracking: {
            id: number;
            campaign_id: number;
            total_budget: import("@prisma/client/runtime/library").Decimal;
            spent_amount: import("@prisma/client/runtime/library").Decimal | null;
            remaining_budget: import("@prisma/client/runtime/library").Decimal | null;
            last_updated: Date | null;
        }[];
        campaign_participants: ({
            creator_profiles: {
                first_name: string;
                last_name: string;
                nickname: string | null;
                profile_image_url: string | null;
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
        campaign_platforms: {
            platform: import(".prisma/client").$Enums.social_platform;
        }[];
        campaign_tags: ({
            tags: {
                name: string;
            };
        } & {
            campaign_id: number;
            tag_id: number;
        })[];
        campaign_videos: {
            title: string;
            id: number;
            created_at: Date | null;
            cover_url: string | null;
        }[];
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
    }>;
    update(id: number, updateCampaignDto: UpdateCampaignDto, user: RequestUser): Promise<{
        business_profiles: {
            company_name: string;
            business_email: string | null;
            logo_url: string | null;
        };
        campaign_budget_tracking: {
            id: number;
            campaign_id: number;
            total_budget: import("@prisma/client/runtime/library").Decimal;
            spent_amount: import("@prisma/client/runtime/library").Decimal | null;
            remaining_budget: import("@prisma/client/runtime/library").Decimal | null;
            last_updated: Date | null;
        }[];
        campaign_participants: ({
            creator_profiles: {
                first_name: string;
                last_name: string;
                nickname: string | null;
                profile_image_url: string | null;
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
        campaign_platforms: {
            platform: import(".prisma/client").$Enums.social_platform;
        }[];
        campaign_tags: ({
            tags: {
                name: string;
            };
        } & {
            campaign_id: number;
            tag_id: number;
        })[];
        campaign_videos: {
            title: string;
            id: number;
            created_at: Date | null;
            cover_url: string | null;
        }[];
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
    }>;
    remove(id: number, user: RequestUser): Promise<{
        message: string;
    }>;
    participate(id: number, user: RequestUser): Promise<{
        message: string;
        participation: {
            campaigns: {
                name: string;
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
        };
    }>;
    updateParticipationStatus(campaignId: number, creatorId: number, user: RequestUser, status: participation_status, rejectionReason?: string): Promise<{
        creator_profiles: {
            first_name: string;
            last_name: string;
            nickname: string | null;
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
    }>;
}
