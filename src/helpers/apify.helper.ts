import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApifyHelper {
  // Fetch Instagram post/reel/video views via Apify actor
  // Requires APIFY_TOKEN. You can override actor with APIFY_INSTAGRAM_ACTOR (default: apify/instagram-post-scraper)
  async getInstagramVideosInfo(postUrls: string[]): Promise<number> {
    const apifyToken = process.env.APIFY_TOKEN;
    const actorId =
      process.env.APIFY_INSTAGRAM_ACTOR || 'apify/instagram-post-scraper';

    if (!apifyToken) {
      throw new Error('APIFY_TOKEN is not set');
    }
    // inside TiktokHelper
    const start = await axios.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apifyToken}`,
      { username: postUrls }, // array of URLs
      { timeout: 30000 },
    );

    const runId = start.data?.data?.id;
    let status = start.data?.data?.status;
    let datasetId = start.data?.data?.defaultDatasetId;

    const terminal = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);
    const deadline = Date.now() + 60000;
    while (!terminal.has(status)) {
      if (Date.now() > deadline) throw new Error('Apify run polling timed out');
      await new Promise((r) => setTimeout(r, 1500));
      const run = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
      );
      status = run.data?.data?.status;
      datasetId = run.data?.data?.defaultDatasetId || datasetId;
    }
    if (status !== 'SUCCEEDED' || !datasetId)
      throw new Error(`Run status: ${status}`);

    const itemsResp = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        params: { token: apifyToken, clean: true, format: 'json' },
        timeout: 20000,
      },
    );
    return itemsResp.data.map((item: any) => {
      return {
        url: item.url,
        views: item.videoViewCount,
        likes: item.likesCount,
        comments: item.commentsCount,
        plays: item.videoPlayCount,
      };
    }); // now populated
  }

  async getTiktokVideosInfo(videoUrls: string[]): Promise<number> {
    const apifyToken = process.env.APIFY_TOKEN;
    const actorId =
      process.env.APIFY_TIKTOK_ACTOR || 'clockworks/tiktok-scraper';

    if (!apifyToken) {
      throw new Error('APIFY_TOKEN is not set');
    }

    // Start actor run
    const start = await axios.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apifyToken}`,
      { postURLs: videoUrls }, // array of URLs
      { timeout: 30000 },
    );

    const runId = start.data?.data?.id;
    let status = start.data?.data?.status;
    let datasetId = start.data?.data?.defaultDatasetId;

    const terminal = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);
    const deadline = Date.now() + 60000;
    while (!terminal.has(status)) {
      if (Date.now() > deadline) throw new Error('Apify run polling timed out');
      await new Promise((r) => setTimeout(r, 1500));
      const run = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
      );
      status = run.data?.data?.status;
      datasetId = run.data?.data?.defaultDatasetId || datasetId;
    }
    if (status !== 'SUCCEEDED' || !datasetId)
      throw new Error(`Run status: ${status}`);

    const itemsResp = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        params: { token: apifyToken, clean: true, format: 'json' },
        timeout: 20000,
      },
    );
    return itemsResp.data.map((item: any) => {
      return {
        videoURL: item.webVideoUrl,
        views: item.playCount,
        likes: item.diggCount,
        comments: item.commentCount,
        shares: item.shareCount,
      };
    }); // now populated
  }
}
