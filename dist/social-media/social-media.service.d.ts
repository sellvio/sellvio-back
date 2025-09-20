import { PrismaService } from '../prisma/prisma.service';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto';
import { social_platform } from '@prisma/client';
export declare class SocialMediaService {
    private prisma;
    constructor(prisma: PrismaService);
    connectAccount(creatorId: number, connectDto: ConnectSocialAccountDto): Promise<{
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
    getConnectedAccounts(creatorId: number): Promise<{
        id: number;
        created_at: Date | null;
        platform: import(".prisma/client").$Enums.social_platform;
        username: string | null;
        profile_url: string | null;
        token_expires_at: Date | null;
        is_connected: boolean | null;
        last_synced: Date | null;
    }[]>;
    disconnectAccount(creatorId: number, platform: social_platform): Promise<{
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
    refreshToken(creatorId: number, platform: social_platform, newAccessToken: string, newRefreshToken?: string, expiresAt?: string): Promise<{
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
    syncAccountData(creatorId: number, platform: social_platform, accountData: any): Promise<{
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
    getAccountAnalytics(creatorId: number, platform?: social_platform): Promise<{
        connectedAccounts: {
            platform: import(".prisma/client").$Enums.social_platform;
            username: string | null;
            is_connected: boolean | null;
        }[];
        analytics: Record<string, any>;
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
    updateVideoSocialPost(videoId: number, platform: social_platform, postUrl: string, platformPostId?: string): Promise<{
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
}
