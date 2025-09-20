import { user_type } from '@prisma/client';
export declare class UserResponseDto {
    id: number;
    email: string;
    user_type: user_type;
    email_verified: boolean;
    created_at?: Date;
}
export declare class AuthResponseDto {
    access_token: string;
    user: UserResponseDto;
}
export declare class BusinessProfileDto {
    company_name: string;
    business_email?: string;
    phone?: string;
    website_url?: string;
    logo_url?: string;
    description?: string;
}
export declare class CreatorProfileDto {
    first_name: string;
    last_name: string;
    nickname?: string;
    creator_type?: string;
    bio?: string;
    profile_image_url?: string;
    location: string;
    phone?: string;
}
export declare class ProfileResponseDto extends UserResponseDto {
    business_profiles?: BusinessProfileDto;
    creator_profiles?: CreatorProfileDto;
}
