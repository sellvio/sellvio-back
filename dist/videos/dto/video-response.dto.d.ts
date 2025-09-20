import { video_status, social_platform } from '@prisma/client';
export declare class VideoResponseDto {
    id: number;
    campaign_id: number;
    creator_id: number;
    title: string;
    description?: string;
    video_url: string;
    cover_url?: string;
    duration_seconds?: number;
    file_size?: number;
    status: video_status;
    submitted_at?: Date;
    reviewed_at?: Date;
    reviewed_by?: number;
    review_comments?: string;
    posted_to_social: boolean;
    created_at: Date;
    updated_at: Date;
}
export declare class CampaignSummaryDto {
    id: number;
    name: string;
    business_profiles: {
        company_name: string;
    };
}
export declare class CreatorSummaryDto {
    first_name: string;
    last_name: string;
    nickname?: string;
    profile_image_url?: string;
}
export declare class VideoAnalyticsDto {
    id: number;
    video_id: number;
    platform: social_platform;
    views: number;
    clicks: number;
    engagement_count: number;
    reach: number;
    earnings_amount: number;
    snapshot_date: Date;
    synced_at: Date;
}
export declare class VideoSocialPostDto {
    id: number;
    video_id: number;
    platform: social_platform;
    post_url: string;
    platform_post_id?: string;
    posted_at: Date;
}
export declare class VideoWithDetailsDto extends VideoResponseDto {
    campaigns: CampaignSummaryDto;
    creator_profiles: CreatorSummaryDto;
    video_analytics: VideoAnalyticsDto[];
    video_social_posts: VideoSocialPostDto[];
}
