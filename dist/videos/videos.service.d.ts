import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { ReviewVideoDto } from './dto/review-video.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { user_type } from '@prisma/client';
export declare class VideosService {
    private prisma;
    constructor(prisma: PrismaService);
    create(campaignId: number, creatorId: number, createVideoDto: CreateVideoDto): Promise<{
        campaigns: {
            name: string;
        };
        creator_profiles: {
            first_name: string;
            last_name: string;
            nickname: string | null;
        };
    } & {
        description: string | null;
        title: string;
        id: number;
        created_at: Date | null;
        updated_at: Date | null;
        creator_id: number;
        status: import(".prisma/client").$Enums.video_status | null;
        campaign_id: number;
        video_url: string;
        cover_url: string | null;
        duration_seconds: number | null;
        file_size: bigint | null;
        submitted_at: Date | null;
        reviewed_at: Date | null;
        reviewed_by: number | null;
        review_comments: string | null;
        posted_to_social: boolean | null;
    }>;
    findAll(pagination: PaginationDto, filters?: any): Promise<{
        data: ({
            campaigns: {
                business_profiles: {
                    company_name: string;
                };
                name: string;
            };
            creator_profiles: {
                first_name: string;
                last_name: string;
                nickname: string | null;
                profile_image_url: string | null;
            };
            video_analytics: {
                platform: import(".prisma/client").$Enums.social_platform;
                views: number | null;
                clicks: number | null;
                engagement_count: number | null;
                reach: number | null;
            }[];
        } & {
            description: string | null;
            title: string;
            id: number;
            created_at: Date | null;
            updated_at: Date | null;
            creator_id: number;
            status: import(".prisma/client").$Enums.video_status | null;
            campaign_id: number;
            video_url: string;
            cover_url: string | null;
            duration_seconds: number | null;
            file_size: bigint | null;
            submitted_at: Date | null;
            reviewed_at: Date | null;
            reviewed_by: number | null;
            review_comments: string | null;
            posted_to_social: boolean | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
    findOne(id: number): Promise<{
        campaigns: {
            business_profiles: {
                company_name: string;
                logo_url: string | null;
            };
            name: string;
            id: number;
            business_id: number;
        };
        creator_profiles: {
            first_name: string;
            last_name: string;
            nickname: string | null;
            profile_image_url: string | null;
        };
        video_analytics: {
            platform: import(".prisma/client").$Enums.social_platform;
            views: number | null;
            clicks: number | null;
            engagement_count: number | null;
            reach: number | null;
            earnings_amount: import("@prisma/client/runtime/library").Decimal | null;
            snapshot_date: Date;
        }[];
        video_social_posts: {
            platform: import(".prisma/client").$Enums.social_platform;
            post_url: string;
            posted_at: Date | null;
        }[];
    } & {
        description: string | null;
        title: string;
        id: number;
        created_at: Date | null;
        updated_at: Date | null;
        creator_id: number;
        status: import(".prisma/client").$Enums.video_status | null;
        campaign_id: number;
        video_url: string;
        cover_url: string | null;
        duration_seconds: number | null;
        file_size: bigint | null;
        submitted_at: Date | null;
        reviewed_at: Date | null;
        reviewed_by: number | null;
        review_comments: string | null;
        posted_to_social: boolean | null;
    }>;
    review(id: number, reviewerId: number, reviewVideoDto: ReviewVideoDto): Promise<{
        campaigns: {
            name: string;
        };
        creator_profiles: {
            first_name: string;
            last_name: string;
            nickname: string | null;
        };
    } & {
        description: string | null;
        title: string;
        id: number;
        created_at: Date | null;
        updated_at: Date | null;
        creator_id: number;
        status: import(".prisma/client").$Enums.video_status | null;
        campaign_id: number;
        video_url: string;
        cover_url: string | null;
        duration_seconds: number | null;
        file_size: bigint | null;
        submitted_at: Date | null;
        reviewed_at: Date | null;
        reviewed_by: number | null;
        review_comments: string | null;
        posted_to_social: boolean | null;
    }>;
    remove(id: number, userId: number, userType: user_type): Promise<{
        message: string;
    }>;
    getVideoAnalytics(id: number): Promise<{
        video: {
            campaigns: {
                name: string;
            };
            title: string;
            id: number;
        };
        analytics: Record<string, {
            id: number;
            platform: import(".prisma/client").$Enums.social_platform;
            video_id: number;
            views: number | null;
            clicks: number | null;
            engagement_count: number | null;
            reach: number | null;
            earnings_amount: import("@prisma/client/runtime/library").Decimal | null;
            snapshot_date: Date;
            synced_at: Date | null;
        }[]>;
    }>;
    updateSocialPost(videoId: number, platform: string, postUrl: string, platformPostId?: string): Promise<{
        message: string;
    }>;
}
