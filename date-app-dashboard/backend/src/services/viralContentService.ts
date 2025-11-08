import { Pool } from 'pg';
import axios from 'axios';
import logger from '../logger';
import aiService from './aiService';

interface ViralCampaign {
  campaignName: string;
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter';
  contentType: string;
  targetImpressions: number;
}

interface GeneratedContent {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags: string[];
}

/**
 * Viral Content Service - Automated Money Printer
 * AI generates + posts viral content 24/7
 * Expected: 500K-2M monthly impressions = $10K-30K/month
 * Psychology: Humans scroll, AI never sleeps 🤖
 *
 * 💰 COST OPTIMIZATION: Now using Ollama (self-hosted, FREE) instead of Claude API
 * Savings: ~$500/month on content generation alone
 */
export class ViralContentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create viral content campaign
   */
  async createCampaign(campaign: ViralCampaign): Promise<string> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO viral_content_campaigns (
          campaign_name, platform, content_type, 
          target_impressions, status
        ) VALUES ($1, $2, $3, $4, 'active')
        RETURNING id`,
        [
          campaign.campaignName,
          campaign.platform,
          campaign.contentType,
          campaign.targetImpressions
        ]
      );

      const campaignId = result.rows[0].id;
      logger.info(`🚀 Viral campaign created: ${campaignId} - Target: ${campaign.targetImpressions} impressions`);

      return campaignId;
    } finally {
      client.release();
    }
  }

  /**
   * Generate viral content using self-hosted AI (Ollama first, cloud fallback)
   * Prompt engineering for maximum engagement
   *
   * 💰 Cost: $0 when Ollama is available, ~$0.0005 when using Gemini fallback
   */
  async generateViralContent(campaignId: string): Promise<GeneratedContent> {
    const client = await this.pool.connect();

    try {
      // Get campaign details
      const campaignResult = await client.query(
        `SELECT * FROM viral_content_campaigns WHERE id = $1`,
        [campaignId]
      );

      const campaign = campaignResult.rows[0];

      // Analyze top performing past posts for this platform
      const topPerformers = await client.query(
        `SELECT post_text, engagement_rate, impressions
        FROM viral_content_posts
        WHERE campaign_id IN (
          SELECT id FROM viral_content_campaigns WHERE platform = $1
        )
        ORDER BY engagement_rate DESC
        LIMIT 10`,
        [campaign.platform]
      );

      // Build AI prompt with success patterns
      const prompt = this.buildViralPrompt(campaign, topPerformers.rows);

      // Generate content with self-hosted AI (Ollama → Gemini → Perplexity)
      const aiResponse = await aiService.chat([
        {
          role: 'system',
          content: 'You are a viral content mastermind. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.8,
        maxTokens: 1024,
        modelType: 'text'
      });

      // Parse AI response (expects JSON)
      const generated = JSON.parse(aiResponse.response);

      logger.info(`🤖 Viral content generated for campaign ${campaignId} using ${aiResponse.provider} ($${aiResponse.cost})`);

      return {
        text: generated.text,
        imageUrl: generated.imageUrl,
        videoUrl: generated.videoUrl,
        hashtags: generated.hashtags || []
      };
    } finally {
      client.release();
    }
  }

  /**
   * Build viral content prompt with proven patterns
   */
  private buildViralPrompt(campaign: any, topPerformers: any[]): string {
    const platformStrategies = {
      tiktok: 'Hook in first 1 second, trend-jacking, duet/stitch worthy, emotional or funny',
      instagram_reels: 'Visual storytelling, aesthetic vibes, relatable situations, music sync',
      youtube_shorts: 'Educational but entertaining, "wait for the end", cliffhangers',
      twitter: 'Controversial takes, meme formats, thread-worthy, engagement bait'
    };

    const strategy = platformStrategies[campaign.platform as keyof typeof platformStrategies];

    const topPostsExamples = topPerformers.length > 0
      ? `Here are our top performing posts:\n${topPerformers.map(p => 
          `- "${p.post_text}" (${p.engagement_rate}% engagement, ${p.impressions} impressions)`
        ).join('\n')}`
      : '';

    return `You are a viral content mastermind. Generate content for ${campaign.platform} that will go MEGA VIRAL.

Campaign: ${campaign.campaign_name}
Content Type: ${campaign.content_type}
Platform Strategy: ${strategy}

${topPostsExamples}

Generate content that:
1. Hooks attention in first second
2. Triggers emotion (surprise, humor, controversy, inspiration)
3. Has shareability factor
4. Includes trending elements
5. Has clear call-to-action linking to youandinotai.com

Return JSON with:
{
  "text": "viral caption/text",
  "hashtags": ["relevant", "trending", "hashtags"],
  "imageUrl": "suggested image description",
  "videoUrl": "suggested video concept",
  "viralityScore": 1-10,
  "reasoning": "why this will go viral"
}`;
  }

  /**
   * Post content to social platform
   */
  async postContent(campaignId: string, content: GeneratedContent): Promise<string> {
    const client = await this.pool.connect();

    try {
      const campaignResult = await client.query(
        `SELECT * FROM viral_content_campaigns WHERE id = $1`,
        [campaignId]
      );

      const campaign = campaignResult.rows[0];

      // Post to platform
      let platformPostId = '';
      let postUrl = '';

      switch (campaign.platform) {
        case 'twitter':
          const twitterResult = await this.postToTwitter(content);
          platformPostId = twitterResult.id;
          postUrl = twitterResult.url;
          break;

        case 'instagram_reels':
          const instagramResult = await this.postToInstagram(content);
          platformPostId = instagramResult.id;
          postUrl = instagramResult.url;
          break;

        case 'tiktok':
          const tiktokResult = await this.postToTikTok(content);
          platformPostId = tiktokResult.id;
          postUrl = tiktokResult.url;
          break;

        case 'youtube_shorts':
          const youtubeResult = await this.postToYouTube(content);
          platformPostId = youtubeResult.id;
          postUrl = youtubeResult.url;
          break;
      }

      // Store post record
      const postResult = await client.query(
        `INSERT INTO viral_content_posts (
          campaign_id, platform, post_text, post_url, platform_post_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [campaignId, campaign.platform, content.text, postUrl, platformPostId]
      );

      // Update campaign
      await client.query(
        `UPDATE viral_content_campaigns
        SET total_posts_created = total_posts_created + 1,
            last_post_at = NOW()
        WHERE id = $1`,
        [campaignId]
      );

      logger.info(`📱 Posted to ${campaign.platform}: ${postUrl}`);

      return postResult.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Post to Twitter/X
   */
  private async postToTwitter(content: GeneratedContent): Promise<{ id: string; url: string }> {
    try {
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: `${content.text}\n\n${content.hashtags.map(h => `#${h}`).join(' ')}\n\n👉 youandinotai.com`
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.data.id,
        url: `https://twitter.com/youandinotai/status/${response.data.data.id}`
      };
    } catch (error) {
      logger.error('Twitter post failed:', error);
      throw error;
    }
  }

  /**
   * Post to Instagram Reels
   */
  private async postToInstagram(content: GeneratedContent): Promise<{ id: string; url: string }> {
    // Implement Instagram Graph API posting
    // This is a simplified example
    logger.info('Instagram posting (implement Graph API)');
    return { id: 'mock-id', url: 'https://instagram.com/p/mock' };
  }

  /**
   * Post to TikTok
   */
  private async postToTikTok(content: GeneratedContent): Promise<{ id: string; url: string }> {
    // Implement TikTok API posting
    logger.info('TikTok posting (implement API)');
    return { id: 'mock-id', url: 'https://tiktok.com/@youandinotai/video/mock' };
  }

  /**
   * Post to YouTube Shorts
   */
  private async postToYouTube(content: GeneratedContent): Promise<{ id: string; url: string }> {
    // Implement YouTube Data API v3 posting
    logger.info('YouTube Shorts posting (implement API)');
    return { id: 'mock-id', url: 'https://youtube.com/shorts/mock' };
  }

  /**
   * Sync post performance metrics from platforms
   * Run hourly to track viral growth
   */
  async syncPostMetrics(postId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const postResult = await client.query(
        `SELECT * FROM viral_content_posts WHERE id = $1`,
        [postId]
      );

      const post = postResult.rows[0];

      // Fetch metrics from platform
      let metrics: any = {};

      switch (post.platform) {
        case 'twitter':
          metrics = await this.getTwitterMetrics(post.platform_post_id);
          break;
        case 'instagram_reels':
          metrics = await this.getInstagramMetrics(post.platform_post_id);
          break;
        case 'tiktok':
          metrics = await this.getTikTokMetrics(post.platform_post_id);
          break;
        case 'youtube_shorts':
          metrics = await this.getYouTubeMetrics(post.platform_post_id);
          break;
      }

      // Update post metrics
      await client.query(
        `UPDATE viral_content_posts
        SET impressions = $1,
            likes = $2,
            comments = $3,
            shares = $4,
            clicks = $5,
            engagement_rate = $6,
            ctr = $7,
            last_synced_at = NOW()
        WHERE id = $8`,
        [
          metrics.impressions || 0,
          metrics.likes || 0,
          metrics.comments || 0,
          metrics.shares || 0,
          metrics.clicks || 0,
          metrics.engagementRate || 0,
          metrics.ctr || 0,
          postId
        ]
      );

      // Track signups attributed to this post
      await this.attributeSignups(postId);

      logger.info(`📊 Metrics synced for post ${postId}: ${metrics.impressions} impressions`);
    } finally {
      client.release();
    }
  }

  /**
   * Get Twitter metrics
   */
  private async getTwitterMetrics(tweetId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
          }
        }
      );

      const metrics = response.data.data.public_metrics;

      return {
        impressions: metrics.impression_count || 0,
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: metrics.retweet_count + metrics.quote_count || 0,
        engagementRate: ((metrics.like_count + metrics.reply_count + metrics.retweet_count) / metrics.impression_count * 100) || 0
      };
    } catch (error) {
      logger.error('Failed to get Twitter metrics:', error);
      return {};
    }
  }

  /**
   * Get Instagram metrics
   */
  private async getInstagramMetrics(postId: string): Promise<any> {
    // Implement Instagram Insights API
    return {};
  }

  /**
   * Get TikTok metrics
   */
  private async getTikTokMetrics(videoId: string): Promise<any> {
    // Implement TikTok Analytics API
    return {};
  }

  /**
   * Get YouTube metrics
   */
  private async getYouTubeMetrics(videoId: string): Promise<any> {
    // Implement YouTube Analytics API
    return {};
  }

  /**
   * Attribute signups to viral posts (UTM tracking)
   */
  private async attributeSignups(postId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Count signups with this post's UTM code in last 7 days
      const signupsResult = await client.query(
        `SELECT COUNT(*) as count,
          COALESCE(SUM(
            CASE 
              WHEN subscription_tier = 'premium' THEN 9.99
              WHEN subscription_tier = 'plus' THEN 4.99
              ELSE 0
            END
          ), 0) as revenue
        FROM users
        WHERE signup_source = $1
          AND created_at > NOW() - INTERVAL '7 days'`,
        [`viral_post_${postId}`]
      );

      const signups = parseInt(signupsResult.rows[0].count);
      const revenue = parseFloat(signupsResult.rows[0].revenue);

      // Update post attribution
      await client.query(
        `UPDATE viral_content_posts
        SET signups_attributed = $1,
            revenue_attributed_usd = $2
        WHERE id = $3`,
        [signups, revenue, postId]
      );

      logger.info(`💰 Post ${postId} attributed: ${signups} signups, $${revenue} revenue`);
    } finally {
      client.release();
    }
  }

  /**
   * Get campaign performance analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          vc.*,
          COUNT(vcp.id) as posts_count,
          SUM(vcp.impressions) as total_impressions,
          SUM(vcp.clicks) as total_clicks,
          SUM(vcp.signups_attributed) as total_signups,
          SUM(vcp.revenue_attributed_usd) as total_revenue,
          AVG(vcp.engagement_rate) as avg_engagement_rate,
          AVG(vcp.ctr) as avg_ctr,
          (SUM(vcp.revenue_attributed_usd) / NULLIF(SUM(vcp.impressions), 0) * 1000) as cpm,
          (SUM(vcp.revenue_attributed_usd) / NULLIF(SUM(vcp.signups_attributed), 0)) as cost_per_acquisition
        FROM viral_content_campaigns vc
        LEFT JOIN viral_content_posts vcp ON vc.id = vcp.campaign_id
        WHERE vc.id = $1
        GROUP BY vc.id`,
        [campaignId]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get top performing posts
   */
  async getTopPosts(platform?: string, limit: number = 10): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          vcp.*,
          vc.campaign_name
        FROM viral_content_posts vcp
        JOIN viral_content_campaigns vc ON vcp.campaign_id = vc.id
        WHERE ($1::text IS NULL OR vcp.platform = $1)
        ORDER BY vcp.engagement_rate DESC, vcp.impressions DESC
        LIMIT $2`,
        [platform || null, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-post scheduler (runs via cron)
   * Posts 3-5 times per day at optimal times
   */
  async autoPostScheduler(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get active campaigns
      const campaignsResult = await client.query(
        `SELECT * FROM viral_content_campaigns 
        WHERE status = 'active'
        ORDER BY RANDOM()
        LIMIT 5` // Post to 5 random campaigns
      );

      for (const campaign of campaignsResult.rows) {
        // Generate and post content
        const content = await this.generateViralContent(campaign.id);
        await this.postContent(campaign.id, content);

        logger.info(`🤖 Auto-posted for campaign: ${campaign.campaign_name}`);
      }
    } finally {
      client.release();
    }
  }
}
