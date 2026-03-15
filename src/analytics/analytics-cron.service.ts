import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ApifyHelper } from '../helpers/apify.helper';

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

  @Cron('0 23 * * *', { timeZone: 'Asia/Tbilisi' })
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
