import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApifyHelper {
  // ─────────────────────────────────────────────────────────────
  // INTERNAL
  // ─────────────────────────────────────────────────────────────

  private apifyToken(): string {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN is not set');
    return token;
  }

  /** Start an Apify actor run and wait until it reaches a terminal state. */
  private async runActor(
    actorId: string,
    input: Record<string, any>,
    timeoutMs = 120_000,
  ): Promise<string> {
    const token = this.apifyToken();

    const start = await axios.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${token}`,
      input,
      { timeout: 30_000 },
    );

    const runId: string = start.data?.data?.id;
    let status: string = start.data?.data?.status;
    let datasetId: string = start.data?.data?.defaultDatasetId;

    const terminal = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);
    const deadline = Date.now() + timeoutMs;

    while (!terminal.has(status)) {
      if (Date.now() > deadline) throw new Error('Apify run polling timed out');
      await new Promise((r) => setTimeout(r, 1500));
      const run = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      );
      status = run.data?.data?.status;
      datasetId = run.data?.data?.defaultDatasetId || datasetId;
    }

    if (status !== 'SUCCEEDED' || !datasetId) {
      throw new Error(`Apify run ended with status: ${status}`);
    }

    return datasetId;
  }

  /** Fetch all items from an Apify dataset. */
  private async fetchDataset(datasetId: string): Promise<any[]> {
    const token = this.apifyToken();
    const resp = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        params: { token, clean: true, format: 'json' },
        timeout: 20_000,
      },
    );
    return resp.data as any[];
  }

  // ─────────────────────────────────────────────────────────────
  // VIDEO SCRAPERS
  // ─────────────────────────────────────────────────────────────

  async getInstagramVideosInfo(postUrls: string[]): Promise<any[]> {
    const actorId =
      process.env.APIFY_INSTAGRAM_ACTOR || 'apify/instagram-post-scraper';

    const datasetId = await this.runActor(actorId, { username: postUrls });
    const items = await this.fetchDataset(datasetId);

    return items.map((item: any) => ({
      url: item.url,
      views: item.videoViewCount,
      likes: item.likesCount,
      comments: item.commentsCount,
      plays: item.videoPlayCount,
    }));
  }

  async getTiktokVideosInfo(videoUrls: string[]): Promise<any[]> {
    const actorId =
      process.env.APIFY_TIKTOK_ACTOR || 'clockworks/tiktok-scraper';

    const datasetId = await this.runActor(actorId, { postURLs: videoUrls });
    const items = await this.fetchDataset(datasetId);
    return items.map((item: any) => ({
      videoURL: item.webVideoUrl,
      views: item.playCount,
      likes: item.diggCount,
      comments: item.commentCount,
      shares: item.shareCount,
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // PROFILE SCRAPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Scrape Instagram profiles and return follower counts.
   * @param usernames  Plain Instagram usernames (without @)
   * Returns: Array of { username, followersCount }
   */
  async getInstagramProfilesInfo(
    usernames: string[],
  ): Promise<{ username: string; followersCount: number }[]> {
    const actorId =
      process.env.APIFY_INSTAGRAM_PROFILE_ACTOR ||
      'apify/instagram-profile-scraper';

    const datasetId = await this.runActor(actorId, { usernames });
    const items = await this.fetchDataset(datasetId);

    return items.map((item: any) => ({
      username: item.username ?? item?.authorMeta?.name ?? item.loginName ?? '',
      followersCount:
        item.authorMeta?.fans ?? item.followersCount ?? item.followers ?? 0,
    }));
  }

  /**
   * Scrape TikTok profiles and return follower counts.
   * @param profileUrls  Full TikTok profile URLs, e.g. https://www.tiktok.com/@username
   * Returns: Array of { username, followersCount }
   */
  async getTiktokProfilesInfo(
    profileUrls: string[],
  ): Promise<{ username: string; followersCount: number }[]> {
    const actorId =
      process.env.APIFY_TIKTOK_PROFILE_ACTOR ||
      'clockworks/tiktok-profile-scraper';

    const datasetId = await this.runActor(actorId, {
      profiles: profileUrls,
    });
    const items = await this.fetchDataset(datasetId);

    return items.map((item: any) => ({
      username: item?.authorMeta?.name ?? item.uniqueId ?? item.username ?? '',
      followersCount:
        item?.authorMeta?.fans ??
        item.stats?.followerCount ??
        item.authorStats?.followerCount ??
        item.followerCount ??
        0,
    }));
  }
}
