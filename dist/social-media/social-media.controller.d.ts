import { SocialMediaService } from './social-media.service';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { social_platform } from '@prisma/client';
export declare class SocialMediaController {
    private readonly socialMediaService;
    constructor(socialMediaService: SocialMediaService);
    connectAccount(connectDto: ConnectSocialAccountDto, user: RequestUser): Promise<{
        message: string;
        account: {
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
        };
    }>;
    getConnectedAccounts(user: RequestUser): Promise<{
        id: number;
        created_at: Date | null;
        platform: import(".prisma/client").$Enums.social_platform;
        username: string | null;
        profile_url: string | null;
        token_expires_at: Date | null;
        is_connected: boolean | null;
        last_synced: Date | null;
    }[]>;
    disconnectAccount(platform: social_platform, user: RequestUser): Promise<{
        message: string;
        account: {
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
        };
    }>;
    refreshToken(platform: social_platform, user: RequestUser, accessToken: string, refreshToken?: string, expiresAt?: string): Promise<{
        message: string;
        account: {
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
        };
    }>;
    syncAccountData(platform: social_platform, user: RequestUser, accountData: any): Promise<{
        message: string;
        account: {
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
        };
    }>;
    getAccountAnalytics(user: RequestUser, platform?: social_platform): Promise<{
        connectedAccounts: {
            platform: import(".prisma/client").$Enums.social_platform;
            username: string | null;
            is_connected: boolean | null;
        }[];
        analytics: Record<string, any>;
    }>;
    updateVideoSocialPost(videoId: number, user: RequestUser, platform: social_platform, postUrl: string, platformPostId?: string): Promise<{
        message: string;
        socialPost: {
            id: number;
            platform: import(".prisma/client").$Enums.social_platform;
            video_id: number;
            post_url: string;
            platform_post_id: string | null;
            posted_at: Date | null;
        };
    }>;
    getExpiringSoonTokens(daysBefore?: number): Promise<({
        creator_profiles: {
            users: {
                email: string;
            };
            first_name: string;
            last_name: string;
        };
    } & {
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
    })[]>;
}
