import { campaign_status, chat_type, creator_type, payment_type, social_platform, participation_status } from '@prisma/client';
export declare class CampaignResponseDto {
    id: number;
    business_id: number;
    name: string;
    description?: string;
    budget: number;
    budget_hidden: boolean;
    duration_days: number;
    finish_date: Date;
    status: campaign_status;
    chat_type: chat_type;
    target_creator_types: creator_type[];
    additional_requirements?: string;
    payment_type: payment_type;
    payment_amount: number;
    payment_per_quantity: number;
    requirements: string;
    target_audience?: string;
    campaign_image_url?: string;
    start_date: Date;
    end_date?: Date;
    created_at: Date;
}
export declare class BusinessProfileSummaryDto {
    company_name: string;
    logo_url?: string;
}
export declare class CampaignPlatformDto {
    platform: social_platform;
}
export declare class CampaignTagDto {
    name: string;
}
export declare class CampaignWithDetailsDto extends CampaignResponseDto {
    business_profiles: BusinessProfileSummaryDto;
    campaign_platforms: CampaignPlatformDto[];
    campaign_tags: {
        tags: CampaignTagDto;
    }[];
    _count: {
        campaign_participants: number;
        campaign_videos: number;
    };
}
export declare class ParticipationResponseDto {
    id: number;
    campaign_id: number;
    creator_id: number;
    status: participation_status;
    applied_at: Date;
    approved_at?: Date;
    approved_by?: number;
    rejection_reason?: string;
}
