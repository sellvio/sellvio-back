import { video_status } from '@prisma/client';
export declare class ReviewVideoDto {
    status: video_status;
    review_comments?: string;
}
