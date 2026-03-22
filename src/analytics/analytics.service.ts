import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  /** For a list of video_analytics rows, return the latest snapshot per (video_id, platform) */
  private latestSnapshotsFrom(rows: any[]) {
    const map = new Map<string, any>();
    for (const row of rows) {
      const key = `${row.video_id}:${row.platform}`;
      const existing = map.get(key);
      if (!existing || row.snapshot_date > existing.snapshot_date) {
        map.set(key, row);
      }
    }
    return [...map.values()];
  }

  private sumAnalytics(rows: any[]) {
    return rows.reduce(
      (acc, r) => ({
        views: acc.views + (r.views ?? 0),
        likes: acc.likes + (r.likes ?? 0),
        comments: acc.comments + (r.comments ?? 0),
        shares: acc.shares + (r.shares ?? 0),
        play_count: acc.play_count + (r.play_count ?? 0),
        engagement_count: acc.engagement_count + (r.engagement_count ?? 0),
      }),
      {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        play_count: 0,
        engagement_count: 0,
      },
    );
  }

  private groupByPlatform(rows: any[]) {
    return rows.reduce(
      (acc, r) => {
        if (!acc[r.platform]) acc[r.platform] = [];
        acc[r.platform].push(r);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIDEO ANALYTICS
  // ─────────────────────────────────────────────────────────────

  async getVideoAnalytics(videoId: number, userId: number) {
    const video = await this.prisma.campaign_videos.findUnique({
      where: { id: videoId },
      include: {
        campaigns: {
          select: { id: true, name: true, business_id: true },
        },
        creator_profiles: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile_image_url: true,
          },
        },
        video_social_posts: {
          select: {
            id: true,
            platform: true,
            post_url: true,
            posted_at: true,
            is_verified: true,
          },
        },
      },
    });

    if (!video) throw new NotFoundException('Video not found');

    const isOwner = video.campaigns.business_id === userId;
    const isCreator = video.creator_id === userId;
    if (!isOwner && !isCreator) throw new ForbiddenException();

    const analyticsRows = await this.prisma.video_analytics.findMany({
      where: { video_id: videoId },
      orderBy: [{ platform: 'asc' }, { snapshot_date: 'desc' }],
    });

    const latest = this.latestSnapshotsFrom(analyticsRows);
    const totals = this.sumAnalytics(latest);
    const byPlatform = this.groupByPlatform(analyticsRows);

    return {
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
        videoUrl: video.video_url,
        coverUrl: video.cover_url,
        submittedAt: video.submitted_at,
        campaign: video.campaigns,
        creator: video.creator_profiles,
        socialPosts: video.video_social_posts,
      },
      totals,
      byPlatform,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CAMPAIGN ANALYTICS
  // ─────────────────────────────────────────────────────────────

  private async assertBusinessOwner(campaignId: number, userId: number) {
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { business_id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.business_id !== userId) throw new ForbiddenException();
    return campaign;
  }

  async getCampaignOverview(campaignId: number, userId: number) {
    await this.assertBusinessOwner(campaignId, userId);

    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      include: {
        campaign_budget_tracking: { take: 1 },
        campaign_participants: { select: { status: true, creator_id: true } },
        campaign_videos: {
          select: {
            id: true,
            status: true,
            video_analytics: true,
          },
        },
        campaign_platforms: { select: { platform: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const approvedParticipants = campaign.campaign_participants.filter(
      (p) => p.status === 'approved',
    );
    const approvedVideos = campaign.campaign_videos.filter(
      (v) => v.status === 'approved',
    );

    const allAnalyticsRows = campaign.campaign_videos.flatMap(
      (v) => v.video_analytics,
    );
    const latest = this.latestSnapshotsFrom(allAnalyticsRows);
    const totals = this.sumAnalytics(latest);

    const platformBreakdown: Record<string, ReturnType<typeof this.sumAnalytics>> = {};
    for (const platform of ['tiktok', 'instagram', 'facebook']) {
      const platformRows = latest.filter((r) => r.platform === platform);
      if (platformRows.length > 0) {
        platformBreakdown[platform] = this.sumAnalytics(platformRows);
      }
    }

    const budget = campaign.campaign_budget_tracking[0] ?? null;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        finishDate: campaign.finish_date,
        paymentType: campaign.payment_type,
        paymentAmount: campaign.payment_amount,
        platforms: campaign.campaign_platforms.map((p) => p.platform),
      },
      budget: budget
        ? {
            total: budget.total_budget,
            spent: budget.spent_amount,
            remaining: budget.remaining_budget,
            lastUpdated: budget.last_updated,
          }
        : null,
      participants: {
        total: campaign.campaign_participants.length,
        approved: approvedParticipants.length,
      },
      videos: {
        total: campaign.campaign_videos.length,
        approved: approvedVideos.length,
      },
      analytics: {
        totals,
        byPlatform: platformBreakdown,
      },
    };
  }

  async getCampaignVideos(campaignId: number, userId: number) {
    await this.assertBusinessOwner(campaignId, userId);

    const videos = await this.prisma.campaign_videos.findMany({
      where: { campaign_id: campaignId },
      orderBy: { created_at: 'desc' },
      include: {
        creator_profiles: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile_image_url: true,
          },
        },
        video_social_posts: {
          select: {
            id: true,
            platform: true,
            post_url: true,
            is_verified: true,
          },
        },
        video_analytics: {
          orderBy: { snapshot_date: 'desc' },
        },
      },
    });

    return videos.map((v) => {
      const latest = this.latestSnapshotsFrom(v.video_analytics);
      const totals = this.sumAnalytics(latest);
      const byPlatform = this.groupByPlatform(latest);

      return {
        id: v.id,
        title: v.title,
        status: v.status,
        videoUrl: v.video_url,
        coverUrl: v.cover_url,
        submittedAt: v.submitted_at,
        creator: v.creator_profiles,
        socialPosts: v.video_social_posts,
        analytics: { totals, byPlatform },
      };
    });
  }

  async getCampaignBudget(campaignId: number, userId: number) {
    await this.assertBusinessOwner(campaignId, userId);

    const tracking = await this.prisma.campaign_budget_tracking.findFirst({
      where: { campaign_id: campaignId },
    });

    if (!tracking) throw new NotFoundException('Budget tracking not found');

    return {
      campaignId,
      totalBudget: tracking.total_budget,
      spentAmount: tracking.spent_amount,
      remainingBudget: tracking.remaining_budget,
      lastUpdated: tracking.last_updated,
    };
  }

  async getCampaignSpend(
    campaignId: number,
    userId: number,
    query: { from?: string; to?: string },
  ) {
    await this.assertBusinessOwner(campaignId, userId);

    const businessProfile = await this.prisma.business_profiles.findUnique({
      where: { user_id: userId },
      select: { user_id: true },
    });
    if (!businessProfile) throw new NotFoundException('Business profile not found');

    const accounts = await this.prisma.business_accounts.findMany({
      where: { business_id: userId },
      select: { id: true, currency: true, balance: true },
    });

    const accountIds = accounts.map((a) => a.id);

    const txWhere: any = {
      business_account_id: { in: accountIds },
    };
    if (query.from || query.to) {
      txWhere.created_at = {};
      if (query.from) txWhere.created_at.gte = new Date(query.from);
      if (query.to) txWhere.created_at.lte = new Date(query.to);
    }

    const transactions = await this.prisma.business_transactions.findMany({
      where: txWhere,
      orderBy: { created_at: 'desc' },
      include: {
        transaction_types: { select: { code: true, name: true } },
        transaction_statuses: { select: { code: true, name: true } },
        currencies: { select: { code: true, name: true } },
      },
    });

    const totalSpent = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    const budget = await this.prisma.campaign_budget_tracking.findFirst({
      where: { campaign_id: campaignId },
    });

    return {
      campaignId,
      accounts,
      budget: budget
        ? {
            total: budget.total_budget,
            spent: budget.spent_amount,
            remaining: budget.remaining_budget,
          }
        : null,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        currency: t.currencies.code,
        type: t.transaction_types,
        status: t.transaction_statuses,
        description: t.description,
        createdAt: t.created_at,
        processedAt: t.processed_at,
      })),
      totalTransactionAmount: totalSpent,
    };
  }

  async getCampaignEarnings(campaignId: number, userId: number) {
    await this.assertBusinessOwner(campaignId, userId);

    const videos = await this.prisma.campaign_videos.findMany({
      where: { campaign_id: campaignId, status: 'approved' },
      include: {
        creator_profiles: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
        video_analytics: {
          orderBy: { snapshot_date: 'desc' },
        },
      },
    });

    const perCreator = new Map<
      number,
      {
        creatorId: number;
        firstName: string | null;
        lastName: string | null;
        videos: {
          videoId: number;
          title: string;
          earningsAmount: number;
        }[];
        totalEarnings: number;
      }
    >();

    for (const v of videos) {
      const latest = this.latestSnapshotsFrom(v.video_analytics);
      const earningsAmount = latest.reduce(
        (sum, r) => sum + Number(r.earnings_amount ?? 0),
        0,
      );

      const creatorId = v.creator_id;
      if (!perCreator.has(creatorId)) {
        perCreator.set(creatorId, {
          creatorId,
          firstName: v.creator_profiles.first_name,
          lastName: v.creator_profiles.last_name,
          videos: [],
          totalEarnings: 0,
        });
      }

      const entry = perCreator.get(creatorId)!;
      entry.videos.push({ videoId: v.id, title: v.title, earningsAmount });
      entry.totalEarnings += earningsAmount;
    }

    const totalCampaignEarnings = [...perCreator.values()].reduce(
      (sum, c) => sum + c.totalEarnings,
      0,
    );

    return {
      campaignId,
      totalEarnings: totalCampaignEarnings,
      perCreator: [...perCreator.values()],
    };
  }

  // ─────────────────────────────────────────────────────────────
  // BUSINESS ANALYTICS
  // ─────────────────────────────────────────────────────────────

  async getBusinessOverview(userId: number) {
    const [campaigns, accounts] = await Promise.all([
      this.prisma.campaigns.findMany({
        where: { business_id: userId },
        include: {
          campaign_budget_tracking: { take: 1 },
          campaign_videos: {
            select: { id: true, status: true, video_analytics: true },
          },
          campaign_participants: { select: { status: true } },
        },
      }),
      this.prisma.business_accounts.findMany({
        where: { business_id: userId },
        include: { currencies: { select: { code: true, name: true } } },
      }),
    ]);

    const allAnalyticsRows = campaigns.flatMap((c) =>
      c.campaign_videos.flatMap((v) => v.video_analytics),
    );
    const latest = this.latestSnapshotsFrom(allAnalyticsRows);
    const totals = this.sumAnalytics(latest);

    const totalVideos = campaigns.reduce(
      (sum, c) => sum + c.campaign_videos.length,
      0,
    );
    const approvedVideos = campaigns.reduce(
      (sum, c) =>
        sum + c.campaign_videos.filter((v) => v.status === 'approved').length,
      0,
    );
    const totalSpent = campaigns.reduce(
      (sum, c) => sum + Number(c.campaign_budget_tracking[0]?.spent_amount ?? 0),
      0,
    );
    const totalBudget = campaigns.reduce(
      (sum, c) => sum + Number(c.campaign_budget_tracking[0]?.total_budget ?? 0),
      0,
    );

    const platformBreakdown: Record<string, any> = {};
    for (const platform of ['tiktok', 'instagram', 'facebook']) {
      const rows = latest.filter((r) => r.platform === platform);
      if (rows.length > 0) platformBreakdown[platform] = this.sumAnalytics(rows);
    }

    return {
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter((c) => c.status === 'active').length,
        completed: campaigns.filter((c) => c.status === 'completed').length,
        paused: campaigns.filter((c) => (c.status as string) === 'paused').length,
      },
      videos: {
        total: totalVideos,
        approved: approvedVideos,
      },
      spend: {
        totalBudget,
        total: totalSpent,
      },
      analytics: {
        totals,
        byPlatform: platformBreakdown,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        balance: a.balance,
        currency: a.currencies,
        isPrimary: a.is_primary,
      })),
    };
  }

  async getBusinessSpend(
    userId: number,
    query: { from?: string; to?: string; page?: number; limit?: number },
  ) {
    const accounts = await this.prisma.business_accounts.findMany({
      where: { business_id: userId },
      select: { id: true, currency: true, balance: true },
    });

    const accountIds = accounts.map((a) => a.id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { business_account_id: { in: accountIds } };
    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) where.created_at.gte = new Date(query.from);
      if (query.to) where.created_at.lte = new Date(query.to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.business_transactions.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          transaction_types: { select: { code: true, name: true } },
          transaction_statuses: { select: { code: true, name: true } },
          currencies: { select: { code: true, name: true } },
        },
      }),
      this.prisma.business_transactions.count({ where }),
    ]);

    return {
      data: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        currency: t.currencies.code,
        type: t.transaction_types,
        status: t.transaction_statuses,
        description: t.description,
        createdAt: t.created_at,
        processedAt: t.processed_at,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBusinessCampaigns(userId: number) {
    const campaigns = await this.prisma.campaigns.findMany({
      where: { business_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        campaign_budget_tracking: { take: 1 },
        campaign_participants: { select: { status: true } },
        campaign_videos: {
          select: { id: true, status: true, video_analytics: true },
        },
        campaign_platforms: { select: { platform: true } },
      },
    });

    return campaigns.map((c) => {
      const allRows = c.campaign_videos.flatMap((v) => v.video_analytics);
      const latest = this.latestSnapshotsFrom(allRows);
      const totals = this.sumAnalytics(latest);
      const budget = c.campaign_budget_tracking[0] ?? null;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        finishDate: c.finish_date,
        platforms: c.campaign_platforms.map((p) => p.platform),
        participants: {
          total: c.campaign_participants.length,
          approved: c.campaign_participants.filter((p) => p.status === 'approved').length,
        },
        videos: {
          total: c.campaign_videos.length,
          approved: c.campaign_videos.filter((v) => v.status === 'approved').length,
        },
        budget: budget
          ? {
              total: budget.total_budget,
              spent: budget.spent_amount,
              remaining: budget.remaining_budget,
            }
          : null,
        analytics: totals,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATOR ANALYTICS
  // ─────────────────────────────────────────────────────────────

  async getCreatorOverview(userId: number) {
    const [participations, videos, accounts] = await Promise.all([
      this.prisma.campaign_participants.findMany({
        where: { creator_id: userId },
        select: {
          status: true,
          campaign_id: true,
          campaigns: { select: { id: true, name: true, status: true } },
        },
      }),
      this.prisma.campaign_videos.findMany({
        where: { creator_id: userId },
        include: { video_analytics: true },
      }),
      this.prisma.creator_accounts.findMany({
        where: { creator_id: userId },
        include: { currencies: { select: { code: true, name: true } } },
      }),
    ]);

    const allRows = videos.flatMap((v) => v.video_analytics);
    const latest = this.latestSnapshotsFrom(allRows);
    const totals = this.sumAnalytics(latest);
    const totalEarnings = latest.reduce(
      (sum, r) => sum + Number(r.earnings_amount ?? 0),
      0,
    );

    const platformBreakdown: Record<string, any> = {};
    for (const platform of ['tiktok', 'instagram', 'facebook']) {
      const rows = latest.filter((r) => r.platform === platform);
      if (rows.length > 0) platformBreakdown[platform] = this.sumAnalytics(rows);
    }

    return {
      campaigns: {
        total: participations.length,
        approved: participations.filter((p) => p.status === 'approved').length,
        pending: participations.filter((p) => p.status === 'pending').length,
      },
      videos: {
        total: videos.length,
        approved: videos.filter((v) => v.status === 'approved').length,
        underReview: videos.filter((v) => v.status === 'under_review').length,
      },
      earnings: {
        total: totalEarnings,
      },
      analytics: {
        totals,
        byPlatform: platformBreakdown,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        availableBalance: a.available_balance,
        pendingBalance: a.pending_balance,
        currency: a.currencies,
        isPrimary: a.is_primary,
      })),
    };
  }

  async getCreatorEarnings(
    userId: number,
    query: { from?: string; to?: string; page?: number; limit?: number },
  ) {
    const accounts = await this.prisma.creator_accounts.findMany({
      where: { creator_id: userId },
      select: { id: true, currency: true, available_balance: true, pending_balance: true },
    });

    const accountIds = accounts.map((a) => a.id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { creator_account_id: { in: accountIds } };
    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) where.created_at.gte = new Date(query.from);
      if (query.to) where.created_at.lte = new Date(query.to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.creator_transactions.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          transaction_types: { select: { code: true, name: true } },
          transaction_statuses: { select: { code: true, name: true } },
          currencies: { select: { code: true, name: true } },
        },
      }),
      this.prisma.creator_transactions.count({ where }),
    ]);

    const totalEarned = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return {
      accounts,
      totalEarned,
      data: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        currency: t.currencies.code,
        type: t.transaction_types,
        status: t.transaction_statuses,
        description: t.description,
        createdAt: t.created_at,
        processedAt: t.processed_at,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCreatorVideos(userId: number) {
    const videos = await this.prisma.campaign_videos.findMany({
      where: { creator_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        campaigns: {
          select: { id: true, name: true, status: true },
        },
        video_social_posts: {
          select: {
            id: true,
            platform: true,
            post_url: true,
            is_verified: true,
          },
        },
        video_analytics: {
          orderBy: { snapshot_date: 'desc' },
        },
      },
    });

    return videos.map((v) => {
      const latest = this.latestSnapshotsFrom(v.video_analytics);
      const totals = this.sumAnalytics(latest);
      const byPlatform = this.groupByPlatform(latest);
      const earnings = latest.reduce(
        (sum, r) => sum + Number(r.earnings_amount ?? 0),
        0,
      );

      return {
        id: v.id,
        title: v.title,
        status: v.status,
        videoUrl: v.video_url,
        coverUrl: v.cover_url,
        submittedAt: v.submitted_at,
        campaign: v.campaigns,
        socialPosts: v.video_social_posts,
        analytics: { totals, byPlatform, earnings },
      };
    });
  }

  async getCreatorCampaigns(userId: number) {
    const participations = await this.prisma.campaign_participants.findMany({
      where: { creator_id: userId },
      orderBy: { applied_at: 'desc' },
      include: {
        campaigns: {
          include: {
            campaign_platforms: { select: { platform: true } },
            campaign_videos: {
              where: { creator_id: userId },
              include: { video_analytics: true },
            },
          },
        },
      },
    });

    return participations.map((p) => {
      const videos = p.campaigns.campaign_videos;
      const allRows = videos.flatMap((v) => v.video_analytics);
      const latest = this.latestSnapshotsFrom(allRows);
      const totals = this.sumAnalytics(latest);
      const earnings = latest.reduce(
        (sum, r) => sum + Number(r.earnings_amount ?? 0),
        0,
      );

      return {
        participationStatus: p.status,
        appliedAt: p.applied_at,
        approvedAt: p.approved_at,
        campaign: {
          id: p.campaigns.id,
          name: p.campaigns.name,
          status: p.campaigns.status,
          finishDate: p.campaigns.finish_date,
          paymentType: p.campaigns.payment_type,
          paymentAmount: p.campaigns.payment_amount,
          platforms: p.campaigns.campaign_platforms.map((pl) => pl.platform),
        },
        videos: {
          total: videos.length,
          approved: videos.filter((v) => v.status === 'approved').length,
        },
        analytics: { totals, earnings },
      };
    });
  }
}
