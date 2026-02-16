import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto';
import { social_platform } from '@prisma/client';

@Injectable()
export class SocialMediaService {
  // Cache for lookup table IDs
  private lookupCache: {
    userTypes?: Map<string, number>;
  } = {};

  constructor(private prisma: PrismaService) {}

  private async getUserTypeId(type: string): Promise<number> {
    if (!this.lookupCache.userTypes) {
      const types = await this.prisma.user_types.findMany();
      this.lookupCache.userTypes = new Map(
        types.map((t) => [t.user_type, t.id]),
      );
    }
    return this.lookupCache.userTypes.get(type) || 1;
  }

  async connectAccount(creatorId: number, connectDto: ConnectSocialAccountDto) {
    // Verify user is a creator
    const creatorTypeId = await this.getUserTypeId('creator');
    const user = await this.prisma.users.findUnique({
      where: { id: creatorId },
      select: { id: true, user_type_id: true, creator_profiles: true },
    });

    if (!user || user.user_type_id !== creatorTypeId) {
      throw new ForbiddenException(
        'Only creators can connect social media accounts',
      );
    }

    // Check if account already exists for this platform
    const existingAccount = await this.prisma.social_media_accounts.findUnique({
      where: {
        creator_id_platform: {
          creator_id: creatorId,
          platform: connectDto.platform,
        },
      },
    });

    if (existingAccount) {
      // Update existing account
      const updatedAccount = await this.prisma.social_media_accounts.update({
        where: { id: existingAccount.id },
        data: {
          username: connectDto.username,
          profile_url: connectDto.profile_url,
          access_token: connectDto.access_token,
          refresh_token: connectDto.refresh_token,
          token_expires_at: connectDto.token_expires_at
            ? new Date(connectDto.token_expires_at)
            : null,
          is_connected: true,
          last_synced: new Date(),
        },
      });

      return {
        message: 'Social media account updated successfully',
        account: updatedAccount,
      };
    } else {
      // Create new account
      const newAccount = await this.prisma.social_media_accounts.create({
        data: {
          creator_id: creatorId,
          platform: connectDto.platform,
          username: connectDto.username,
          profile_url: connectDto.profile_url,
          access_token: connectDto.access_token,
          refresh_token: connectDto.refresh_token,
          token_expires_at: connectDto.token_expires_at
            ? new Date(connectDto.token_expires_at)
            : null,
          is_connected: true,
          last_synced: new Date(),
        },
      });

      return {
        message: 'Social media account connected successfully',
        account: newAccount,
      };
    }
  }

  async getConnectedAccounts(creatorId: number) {
    const creatorTypeId = await this.getUserTypeId('creator');
    const user = await this.prisma.users.findUnique({
      where: { id: creatorId },
      select: { id: true, user_type_id: true },
    });

    if (!user || user.user_type_id !== creatorTypeId) {
      throw new ForbiddenException(
        'Only creators can view social media accounts',
      );
    }

    const accounts = await this.prisma.social_media_accounts.findMany({
      where: { creator_id: creatorId },
      select: {
        id: true,
        platform: true,
        username: true,
        profile_url: true,
        is_connected: true,
        last_synced: true,
        created_at: true,
        token_expires_at: true,
      },
      orderBy: {
        platform: 'asc',
      },
    });

    return accounts;
  }

  async disconnectAccount(creatorId: number, platform: social_platform) {
    const account = await this.prisma.social_media_accounts.findUnique({
      where: {
        creator_id_platform: {
          creator_id: creatorId,
          platform,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Social media account not found');
    }

    const updatedAccount = await this.prisma.social_media_accounts.update({
      where: { id: account.id },
      data: {
        is_connected: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
      },
    });

    return {
      message: 'Social media account disconnected successfully',
      account: updatedAccount,
    };
  }

  async refreshToken(
    creatorId: number,
    platform: social_platform,
    newAccessToken: string,
    newRefreshToken?: string,
    expiresAt?: string,
  ) {
    const account = await this.prisma.social_media_accounts.findUnique({
      where: {
        creator_id_platform: {
          creator_id: creatorId,
          platform,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Social media account not found');
    }

    const updatedAccount = await this.prisma.social_media_accounts.update({
      where: { id: account.id },
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken || account.refresh_token,
        token_expires_at: expiresAt
          ? new Date(expiresAt)
          : account.token_expires_at,
        last_synced: new Date(),
      },
    });

    return {
      message: 'Token refreshed successfully',
      account: updatedAccount,
    };
  }

  async syncAccountData(
    creatorId: number,
    platform: social_platform,
    accountData: any,
  ) {
    const account = await this.prisma.social_media_accounts.findUnique({
      where: {
        creator_id_platform: {
          creator_id: creatorId,
          platform,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Social media account not found');
    }

    if (!account.is_connected) {
      throw new BadRequestException('Account is not connected');
    }

    const updatedAccount = await this.prisma.social_media_accounts.update({
      where: { id: account.id },
      data: {
        username: accountData.username || account.username,
        profile_url: accountData.profile_url || account.profile_url,
        last_synced: new Date(),
      },
    });

    return {
      message: 'Account data synchronized successfully',
      account: updatedAccount,
    };
  }

  async getAccountAnalytics(creatorId: number, platform?: social_platform) {
    const where: any = { creator_id: creatorId };

    if (platform) {
      where.platform = platform;
    }

    // Get connected accounts
    const accounts = await this.prisma.social_media_accounts.findMany({
      where,
      select: {
        platform: true,
        username: true,
        is_connected: true,
      },
    });

    // Get video analytics for these platforms
    const videoAnalytics = await this.prisma.video_analytics.findMany({
      where: {
        ...(platform && { platform }),
        campaign_videos: {
          creator_id: creatorId,
        },
      },
      include: {
        campaign_videos: {
          select: {
            title: true,
            campaigns: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        snapshot_date: 'desc',
      },
    });

    // Group analytics by platform
    const analyticsGrouped = videoAnalytics.reduce(
      (acc, item) => {
        if (!acc[item.platform]) {
          acc[item.platform] = {
            totalViews: 0,
            totalClicks: 0,
            totalEngagement: 0,
            totalReach: 0,
            totalEarnings: 0,
            videos: [],
          };
        }

        acc[item.platform].totalViews += item.views || 0;
        acc[item.platform].totalClicks += item.clicks || 0;
        acc[item.platform].totalEngagement += item.engagement_count || 0;
        acc[item.platform].totalReach += item.reach || 0;
        acc[item.platform].totalEarnings +=
          item.earnings_amount?.toNumber() || 0;
        acc[item.platform].videos.push(item);

        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      connectedAccounts: accounts,
      analytics: analyticsGrouped,
    };
  }

  async getExpiringSoonTokens(daysBefore = 7) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysBefore);

    const accounts = await this.prisma.social_media_accounts.findMany({
      where: {
        is_connected: true,
        token_expires_at: {
          lte: expirationDate,
          gte: new Date(),
        },
      },
      include: {
        creator_profiles: {
          select: {
            first_name: true,
            last_name: true,
            users: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    return accounts;
  }

  async updateVideoSocialPost(
    videoId: number,
    platform: social_platform,
    postUrl: string,
    platformPostId?: string,
  ) {
    // Verify video exists
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const socialPost = await this.prisma.video_social_posts.upsert({
      where: {
        video_id_platform: {
          video_id: videoId,
          platform,
        },
      },
      update: {
        post_url: postUrl,
        platform_post_id: platformPostId,
        posted_at: new Date(),
      },
      create: {
        video_id: videoId,
        platform,
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

    return {
      message: 'Social post updated successfully',
      socialPost,
    };
  }
}
