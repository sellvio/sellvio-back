import { campaign_status, chat_type, creator_type, payment_type, social_platform } from '@prisma/client';
export declare class CreateCampaignDto {
    name: string;
    description?: string;
    budget: number;
    budget_hidden?: boolean;
    duration_days: number;
    finish_date: string;
    status?: campaign_status;
    chat_type?: chat_type;
    target_creator_types: creator_type[];
    additional_requirements?: string;
    payment_type: payment_type;
    payment_amount: number;
    payment_per_quantity: number;
    requirements: string;
    target_audience?: string;
    campaign_image_url?: string;
    platforms?: social_platform[];
    tags?: string[];
}
