import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { payment_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApifyHelper } from '../helpers/apify.helper';

interface ProcessedEntry {
  videoId: number;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  play_count: number;
  clicks: number;
  engagement_count: number;
  reach: number;
}

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apify: ApifyHelper,
  ) {}

  private extractInstagramShortcode(url: string): string | null {
    const match = url?.match(/\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
    return match?.[1] ?? null;
  }

  private extractTiktokVideoId(url: string): string | null {
    const match = url?.match(/\/video\/(\d+)/);
    return match?.[1] ?? null;
  }

  private calculateEarnings(
    metrics: Pick<
      ProcessedEntry,
      'views' | 'clicks' | 'engagement_count' | 'reach'
    >,
    paymentType: payment_type,
    paymentAmount: number,
    paymentPerQuantity: number,
  ): number {
    if (paymentPerQuantity <= 0) return 0;

    let metric = 0;
    switch (paymentType) {
      case payment_type.cost_per_view:
        metric = metrics.views;
        break;
      case payment_type.cost_per_click:
        metric = metrics.clicks;
        break;
      case payment_type.cost_per_engagement:
        metric = metrics.engagement_count;
        break;
      case payment_type.cost_per_reach:
        metric = metrics.reach;
        break;
    }

    return (metric / paymentPerQuantity) * paymentAmount;
  }

  private async recalculateCampaignBudget(campaignId: number): Promise<void> {
    const budgetTracking = await this.prisma.campaign_budget_tracking.findFirst(
      {
        where: { campaign_id: campaignId },
        select: { total_budget: true },
      },
    );

    if (!budgetTracking) return;

    // Get all analytics rows for this campaign's videos
    const allAnalytics = await this.prisma.video_analytics.findMany({
      where: {
        campaign_videos: { campaign_id: campaignId },
      },
      select: {
        video_id: true,
        platform: true,
        snapshot_date: true,
        earnings_amount: true,
      },
    });

    // Keep only the latest snapshot per (video_id, platform)
    const latestMap = new Map<string, (typeof allAnalytics)[0]>();
    for (const row of allAnalytics) {
      const key = `${row.video_id}:${row.platform}`;
      const existing = latestMap.get(key);
      if (!existing || row.snapshot_date > existing.snapshot_date) {
        latestMap.set(key, row);
      }
    }

    const totalSpent = [...latestMap.values()].reduce(
      (sum, r) => sum + Number(r.earnings_amount ?? 0),
      0,
    );
    const remaining = Math.max(
      0,
      Number(budgetTracking.total_budget) - totalSpent,
    );

    await this.prisma.campaign_budget_tracking.updateMany({
      where: { campaign_id: campaignId },
      data: {
        spent_amount: totalSpent,
        last_updated: new Date(),
      },
    });
  }

  private async calculateAndSaveEarnings(
    processedEntries: ProcessedEntry[],
    snapshotDate: Date,
  ): Promise<void> {
    if (processedEntries.length === 0) return;

    const videoIds = [...new Set(processedEntries.map((e) => e.videoId))];

    const videos = await this.prisma.campaign_videos.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        campaign_id: true,
        campaigns: {
          select: {
            payment_type: true,
            payment_amount: true,
            payment_per_quantity: true,
          },
        },
      },
    });

    const videoMap = new Map(videos.map((v) => [v.id, v]));

    // Update earnings_amount on each freshly saved analytics row
    const earningsUpdates = processedEntries
      .map((entry) => {
        const video = videoMap.get(entry.videoId);
        if (!video) return null;

        const {
          payment_type: pType,
          payment_amount,
          payment_per_quantity,
        } = video.campaigns;

        const earnings = this.calculateEarnings(
          entry,
          pType,
          Number(payment_amount),
          payment_per_quantity,
        );

        return this.prisma.video_analytics.updateMany({
          where: {
            video_id: entry.videoId,
            platform: entry.platform as any,
            snapshot_date: snapshotDate,
          },
          data: { earnings_amount: earnings },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    await Promise.all(earningsUpdates);

    // Recalculate spent_amount for every affected campaign
    const campaignIds = [...new Set(videos.map((v) => v.campaign_id))];
    await Promise.all(
      campaignIds.map((id) => this.recalculateCampaignBudget(id)),
    );

    this.logger.log(
      `Earnings calculated for ${processedEntries.length} analytics rows across ${campaignIds.length} campaign(s).`,
    );
  }

  @Cron('20 16 * * *', { timeZone: 'Asia/Tbilisi' })
  async syncVideoAnalytics() {
    this.logger.log('Starting daily video analytics sync...');

    const automationName = 'daily_video_analytics_sync';
    const snapshotDate = new Date();
    snapshotDate.setUTCHours(0, 0, 0, 0);

    await this.prisma.automation_triggers.upsert({
      where: { automation_name: automationName },
      create: {
        automation_name: automationName,
        is_active: true,
        last_triggered_at: new Date(),
        status: 'running',
      },
      update: {
        last_triggered_at: new Date(),
        status: 'running',
        error_log: null,
      },
    });

    try {
      const verifiedPosts = await this.prisma.video_social_posts.findMany({
        where: {
          is_verified: true,
          platform: { in: ['tiktok', 'instagram'] },
        },
        select: {
          id: true,
          video_id: true,
          platform: true,
          post_url: true,
        },
      });

      if (verifiedPosts.length === 0) {
        this.logger.log('No verified TikTok/Instagram posts found, skipping.');
        await this.markDone(automationName);
        return;
      }

      const tiktokPosts = verifiedPosts.filter((p) => p.platform === 'tiktok');
      const instagramPosts = verifiedPosts.filter(
        (p) => p.platform === 'instagram',
      );

      const upserts: Promise<any>[] = [];
      const processedEntries: ProcessedEntry[] = [];

      // ── TikTok ──
      if (tiktokPosts.length > 0) {
        this.logger.log(
          `Fetching TikTok analytics for ${tiktokPosts.length} posts...`,
        );
        const tiktokUrls = tiktokPosts.map((p) => p.post_url);
        const tiktokResults: any[] = (await this.apify.getTiktokVideosInfo(
          tiktokUrls,
        )) as any;

        for (const result of tiktokResults) {
          const resultId = this.extractTiktokVideoId(result.videoURL);
          const match = tiktokPosts.find((p) => {
            if (!resultId) return false;
            const postId = this.extractTiktokVideoId(p.post_url);
            return postId === resultId;
          });
          if (!match) continue;

          const data = {
            views: result.views ?? 0,
            likes: result.likes ?? 0,
            comments: result.comments ?? 0,
            shares: result.shares ?? 0,
            synced_at: new Date(),
          };

          processedEntries.push({
            videoId: match.video_id,
            platform: 'tiktok',
            views: data.views,
            likes: data.likes,
            comments: data.comments,
            shares: data.shares,
            play_count: 0,
            clicks: 0,
            engagement_count: 0,
            reach: 0,
          });

          upserts.push(
            this.prisma.video_analytics.upsert({
              where: {
                video_id_platform_snapshot_date: {
                  video_id: match.video_id,
                  platform: 'tiktok',
                  snapshot_date: snapshotDate,
                },
              },
              create: {
                video_id: match.video_id,
                platform: 'tiktok',
                snapshot_date: snapshotDate,
                ...data,
              },
              update: data,
            }),
          );
        }
      }

      // ── Instagram ──
      if (instagramPosts.length > 0) {
        this.logger.log(
          `Fetching Instagram analytics for ${instagramPosts.length} posts...`,
        );
        const instagramUrls = instagramPosts.map((p) => p.post_url);
        const instagramResults: any[] =
          (await this.apify.getInstagramVideosInfo(instagramUrls)) as any;

        for (const result of instagramResults) {
          const resultShortcode = this.extractInstagramShortcode(result.url);
          const match = instagramPosts.find((p) => {
            if (!resultShortcode) return false;
            const postShortcode = this.extractInstagramShortcode(p.post_url);
            return postShortcode === resultShortcode;
          });
          if (!match) continue;

          const data = {
            views: result.views ?? 0,
            likes: result.likes ?? 0,
            comments: result.comments ?? 0,
            play_count: result.plays ?? result.play_count ?? 0,
            synced_at: new Date(),
          };

          processedEntries.push({
            videoId: match.video_id,
            platform: 'instagram',
            views: data.views,
            likes: data.likes,
            comments: data.comments,
            shares: 0,
            play_count: data.play_count,
            clicks: 0,
            engagement_count: 0,
            reach: 0,
          });

          upserts.push(
            this.prisma.video_analytics.upsert({
              where: {
                video_id_platform_snapshot_date: {
                  video_id: match.video_id,
                  platform: 'instagram',
                  snapshot_date: snapshotDate,
                },
              },
              create: {
                video_id: match.video_id,
                platform: 'instagram',
                snapshot_date: snapshotDate,
                ...data,
              },
              update: data,
            }),
          );
        }
      }

      await Promise.all(upserts);
      this.logger.log(
        `Analytics sync complete. Saved ${upserts.length} records.`,
      );

      await this.calculateAndSaveEarnings(processedEntries, snapshotDate);

      await this.markDone(automationName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Analytics sync failed: ${message}`);

      await this.prisma.automation_triggers.update({
        where: { automation_name: automationName },
        data: {
          status: 'failed',
          error_log: message,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PROFILE FOLLOWERS SYNC
  // ─────────────────────────────────────────────────────────────

  // @Cron('10 16 * * *', { timeZone: 'Asia/Tbilisi' })
  // async syncProfileFollowers() {
  //   this.logger.log('Starting daily profile followers sync...');

  //   const automationName = 'daily_profile_followers_sync';

  //   await this.prisma.automation_triggers.upsert({
  //     where: { automation_name: automationName },
  //     create: {
  //       automation_name: automationName,
  //       is_active: true,
  //       last_triggered_at: new Date(),
  //       status: 'running',
  //     },
  //     update: {
  //       last_triggered_at: new Date(),
  //       status: 'running',
  //       error_log: null,
  //     },
  //   });

  //   try {
  //     const accounts = await this.prisma.social_media_accounts.findMany({
  //       where: {
  //         platform: { in: ['instagram', 'tiktok'] },
  //         OR: [{ username: { not: null } }, { profile_url: { not: null } }],
  //       },
  //       select: {
  //         id: true,
  //         platform: true,
  //         username: true,
  //         profile_url: true,
  //       },
  //     });

  //     const instagramAccounts = accounts.filter(
  //       (a) => a.platform === 'instagram',
  //     );
  //     const tiktokAccounts = accounts.filter((a) => a.platform === 'tiktok');

  //     const updates: Promise<any>[] = [];

  //     // ── Instagram ──
  //     if (instagramAccounts.length > 0) {
  //       const usernames = instagramAccounts
  //         .map(
  //           (a) =>
  //             a.username ?? this.extractInstagramUsername(a.profile_url ?? ''),
  //         )
  //         .filter((u): u is string => !!u);

  //       if (usernames.length > 0) {
  //         this.logger.log(
  //           `Fetching Instagram profiles for ${usernames.length} accounts...`,
  //         );

  //         const results = await this.apify.getInstagramProfilesInfo(usernames);
  //         const resultMap = new Map(
  //           results.map((r) => [r.username.toLowerCase(), r.followersCount]),
  //         );

  //         for (const account of instagramAccounts) {
  //           const key = (
  //             account.username ??
  //             this.extractInstagramUsername(account.profile_url ?? '') ??
  //             ''
  //           ).toLowerCase();

  //           const followersCount = resultMap.get(key);
  //           if (followersCount === undefined) continue;
  //           console.log(account.username, followersCount);
  //           updates.push(
  //             this.prisma.social_media_accounts.update({
  //               where: { id: account.id },
  //               data: {
  //                 followers_count: followersCount,
  //                 last_synced: new Date(),
  //               },
  //             }),
  //           );
  //         }
  //       }
  //     }

  //     // ── TikTok ──
  //     if (tiktokAccounts.length > 0) {
  //       const profileUrls = tiktokAccounts
  //         .map(
  //           (a) =>
  //             a.profile_url ?? this.buildTiktokProfileUrl(a.username ?? ''),
  //         )
  //         .filter((u): u is string => !!u);

  //       if (profileUrls.length > 0) {
  //         this.logger.log(
  //           `Fetching TikTok profiles for ${profileUrls.length} accounts...`,
  //         );

  //         const results = await this.apify.getTiktokProfilesInfo(profileUrls);
  //         const resultMap = new Map(
  //           results.map((r) => [
  //             r.username.toLowerCase().replace(/^@/, ''),
  //             r.followersCount,
  //           ]),
  //         );

  //         for (const account of tiktokAccounts) {
  //           const key = (
  //             account.username ??
  //             this.extractTiktokUsername(account.profile_url ?? '') ??
  //             ''
  //           )
  //             .toLowerCase()
  //             .replace(/^@/, '');

  //           const followersCount = resultMap.get(key);
  //           if (followersCount === undefined) continue;

  //           updates.push(
  //             this.prisma.social_media_accounts.update({
  //               where: { id: account.id },
  //               data: {
  //                 followers_count: followersCount,
  //                 last_synced: new Date(),
  //               },
  //             }),
  //           );
  //         }
  //       }
  //     }

  //     await Promise.all(updates);
  //     this.logger.log(
  //       `Profile followers sync complete. Updated ${updates.length} accounts.`,
  //     );

  //     await this.markDone(automationName);
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : String(err);
  //     this.logger.error(`Profile followers sync failed: ${message}`);

  //     await this.prisma.automation_triggers.update({
  //       where: { automation_name: automationName },
  //       data: { status: 'failed', error_log: message },
  //     });
  //   }
  // }

  private extractInstagramUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([^/?#]+)/);
    return match?.[1] ?? null;
  }

  private extractTiktokUsername(url: string): string | null {
    const match = url.match(/tiktok\.com\/@([^/?#]+)/);
    return match?.[1] ?? null;
  }

  private buildTiktokProfileUrl(username: string): string | null {
    if (!username) return null;
    const clean = username.replace(/^@/, '');
    return `https://www.tiktok.com/@${clean}`;
  }

  private async markDone(automationName: string) {
    await this.prisma.automation_triggers.update({
      where: { automation_name: automationName },
      data: {
        last_completed_at: new Date(),
        status: 'completed',
      },
    });
  }
}
