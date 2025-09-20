import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { ReviewVideoDto } from './dto/review-video.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { user_type, video_status, participation_status } from '@prisma/client';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  async create(
    campaignId: number,
    creatorId: number,
    createVideoDto: CreateVideoDto,
  ) {
    // Verify creator is approved for this campaign
    const participation = await this.prisma.campaign_participants.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: campaignId,
          creator_id: creatorId,
        },
      },
      include: {
        campaigns: true,
      },
    });

    if (!participation) {
      throw new ForbiddenException(
        'You are not participating in this campaign',
      );
    }

    if (participation.status !== participation_status.approved) {
      throw new ForbiddenException('You must be approved to submit videos');
    }

    // Check if campaign is still active
    if (participation.campaigns.status !== 'active') {
      throw new BadRequestException('Campaign is not active');
    }

    const video = await this.prisma.campaign_videos.create({
      data: {
        campaign_id: campaignId,
        creator_id: creatorId,
        ...createVideoDto,
        submitted_at: new Date(),
      },
      include: {
        campaigns: {
          select: {
            name: true,
          },
        },
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            nickname: true,
          },
        },
      },
    });

    return video;
  }

  async findAll(pagination: PaginationDto, filters?: any) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.campaign_id) {
      where.campaign_id = filters.campaign_id;
    }

    if (filters?.creator_id) {
      where.creator_id = filters.creator_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [videos, total] = await Promise.all([
      this.prisma.campaign_videos.findMany({
        where,
        skip,
        take: limit,
        include: {
          campaigns: {
            select: {
              name: true,
              business_profiles: {
                select: {
                  company_name: true,
                },
              },
            },
          },
          creator_profiles: {
            select: {
              first_name: true,
              last_name: true,
              nickname: true,
              profile_image_url: true,
            },
          },
          video_analytics: {
            select: {
              platform: true,
              views: true,
              clicks: true,
              engagement_count: true,
              reach: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.campaign_videos.count({ where }),
    ]);

    return {
      data: videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async findOne(id: number) {
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            business_id: true,
            business_profiles: {
              select: {
                company_name: true,
                logo_url: true,
              },
            },
          },
        },
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            nickname: true,
            profile_image_url: true,
          },
        },
        video_analytics: {
          select: {
            platform: true,
            views: true,
            clicks: true,
            engagement_count: true,
            reach: true,
            earnings_amount: true,
            snapshot_date: true,
          },
          orderBy: {
            snapshot_date: 'desc',
          },
        },
        video_social_posts: {
          select: {
            platform: true,
            post_url: true,
            posted_at: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async review(id: number, reviewerId: number, reviewVideoDto: ReviewVideoDto) {
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id },
      include: {
        campaigns: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Only business owner can review videos
    if (video.campaigns.business_id !== reviewerId) {
      throw new ForbiddenException(
        'You can only review videos for your own campaigns',
      );
    }

    const updatedVideo = await this.prisma.campaign_videos.update({
      where: { id },
      data: {
        status: reviewVideoDto.status,
        review_comments: reviewVideoDto.review_comments,
        reviewed_at: new Date(),
        reviewed_by: reviewerId,
      },
      include: {
        campaigns: {
          select: {
            name: true,
          },
        },
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            nickname: true,
          },
        },
      },
    });

    return updatedVideo;
  }

  async remove(id: number, userId: number, userType: user_type) {
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id },
      include: {
        campaigns: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Creators can delete their own videos, businesses can delete any video from their campaigns
    const canDelete =
      (userType === user_type.creator && video.creator_id === userId) ||
      (userType === user_type.business &&
        video.campaigns.business_id === userId);

    if (!canDelete) {
      throw new ForbiddenException('You cannot delete this video');
    }

    // Cannot delete approved videos that have been posted
    if (video.status === video_status.approved && video.posted_to_social) {
      throw new BadRequestException(
        'Cannot delete videos that have been posted to social media',
      );
    }

    await this.prisma.campaign_videos.delete({
      where: { id },
    });

    return { message: 'Video deleted successfully' };
  }

  async getVideoAnalytics(id: number) {
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        campaigns: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const analytics = await this.prisma.video_analytics.findMany({
      where: { video_id: id },
      orderBy: [{ platform: 'asc' }, { snapshot_date: 'desc' }],
    });

    // Group analytics by platform
    const analyticsGrouped = analytics.reduce(
      (acc, item) => {
        if (!acc[item.platform]) {
          acc[item.platform] = [];
        }
        acc[item.platform].push(item);
        return acc;
      },
      {} as Record<string, typeof analytics>,
    );

    return {
      video,
      analytics: analyticsGrouped,
    };
  }

  async updateSocialPost(
    videoId: number,
    platform: string,
    postUrl: string,
    platformPostId?: string,
  ) {
    await this.prisma.video_social_posts.upsert({
      where: {
        video_id_platform: {
          video_id: videoId,
          platform: platform as any,
        },
      },
      update: {
        post_url: postUrl,
        platform_post_id: platformPostId,
        posted_at: new Date(),
      },
      create: {
        video_id: videoId,
        platform: platform as any,
        post_url: postUrl,
        platform_post_id: platformPostId,
        posted_at: new Date(),
      },
    });

    // Mark video as posted to social
    await this.prisma.campaign_videos.update({
      where: { id: videoId },
      data: { posted_to_social: true },
    });

    return { message: 'Social post updated successfully' };
  }
}
