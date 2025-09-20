import { user_type, creator_type } from '@prisma/client';
export declare class RegisterDto {
    email: string;
    password: string;
    user_type: user_type;
    creator_type?: creator_type;
    first_name?: string;
    last_name?: string;
    nickname?: string;
    location?: string;
    tags?: string[];
    company_name?: string;
    website_url?: string;
    business_email?: string;
    phone?: string;
}
