import { social_platform } from '@prisma/client';
export declare class ConnectSocialAccountDto {
    platform: social_platform;
    username?: string;
    profile_url?: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: string;
}
