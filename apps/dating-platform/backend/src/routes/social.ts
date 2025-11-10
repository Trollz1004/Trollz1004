import { Router, Response } from 'express';
import pool from '../database';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth';
import logger from '../logger';
import { scheduleTweet } from '../automations/social/twitterService';
import { scheduleInstagramStory } from '../automations/social/instagramService';
import { scheduleRedditPost, getRandomSubreddit } from '../automations/social/redditService';
import {
  addContent,
  getContentByPlatform,
  deactivateContent,
} from '../automations/social/contentPoolService';
import {
  getAllPlatformsAnalytics,
  getAllCohortsAnalytics,
  calculatePlatformROI,
} from '../automations/social/socialAnalyticsService';

export const socialRouter = Router();

/**
 * POST /api/social/schedule-post
 * Schedule a social media post
 * Admin only
 */
socialRouter.post('/schedule-post', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform, contentPoolId, scheduledFor, customContent, subreddit } = req.body;

  if (!platform || !['twitter', 'instagram', 'reddit'].includes(platform)) {
    return res.status(400).json({ message: 'Invalid platform. Must be twitter, instagram, or reddit' });
  }

  try {
    let postId: string | null = null;

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : undefined;

    if (platform === 'twitter') {
      postId = await scheduleTweet(undefined, scheduledDate);
    } else if (platform === 'instagram') {
      postId = await scheduleInstagramStory(undefined, scheduledDate);
    } else if (platform === 'reddit') {
      const targetSubreddit = subreddit || getRandomSubreddit();
      postId = await scheduleRedditPost(targetSubreddit, undefined, scheduledDate);
    }

    if (!postId) {
      return res.status(500).json({ message: 'Failed to schedule post' });
    }

    res.status(201).json({
      message: 'Post scheduled successfully',
      postId,
      platform,
      scheduledFor: scheduledDate,
    });
  } catch (error: any) {
    logger.error('Schedule post error:', error);
    res.status(500).json({ message: 'Failed to schedule post' });
  }
});

/**
 * GET /api/social/queue
 * View queued social media posts
 * Admin only
 */
socialRouter.get('/queue', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform, status, limit = '100' } = req.query;

  try {
    let query = 'SELECT * FROM social_posts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (platform) {
      query += ` AND platform = $${paramIndex++}`;
      params.push(platform);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_for DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string, 10));

    const result = await pool.query(query, params);

    res.json({
      posts: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    logger.error('Get queue error:', error);
    res.status(500).json({ message: 'Failed to fetch queue' });
  }
});

/**
 * POST /api/social/content-pool
 * Add content to content pool
 * Admin only
 */
socialRouter.post('/content-pool', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform, contentType, contentText, hashtags, callToAction, mediaUrl, utmParameters } =
    req.body;

  if (!platform || !contentType || !contentText) {
    return res.status(400).json({
      message: 'Missing required fields: platform, contentType, contentText',
    });
  }

  if (!['twitter', 'instagram', 'reddit'].includes(platform)) {
    return res.status(400).json({ message: 'Invalid platform' });
  }

  try {
    const contentId = await addContent({
      platform,
      contentType,
      contentText,
      hashtags,
      callToAction,
      mediaUrl,
      utmParameters,
      createdBy: req.userId || 'admin',
    });

    res.status(201).json({
      message: 'Content added to pool successfully',
      contentId,
    });
  } catch (error: any) {
    logger.error('Add content error:', error);
    res.status(500).json({ message: 'Failed to add content' });
  }
});

/**
 * GET /api/social/content-pool
 * Get content pool by platform
 * Admin only
 */
socialRouter.get('/content-pool', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform, type } = req.query;

  if (!platform) {
    return res.status(400).json({ message: 'Platform parameter required' });
  }

  try {
    const content = await getContentByPlatform(platform as string, true);

    // Filter by type if provided
    let filteredContent = content;
    if (type) {
      filteredContent = content.filter((c) => c.contentType === type);
    }

    res.json({
      content: filteredContent,
      total: filteredContent.length,
    });
  } catch (error: any) {
    logger.error('Get content pool error:', error);
    res.status(500).json({ message: 'Failed to fetch content pool' });
  }
});

/**
 * DELETE /api/social/content/:id
 * Deactivate content from pool
 * Admin only
 */
socialRouter.delete('/content/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await deactivateContent(id);

    res.json({
      message: 'Content deactivated successfully',
      contentId: id,
    });
  } catch (error: any) {
    logger.error('Delete content error:', error);
    res.status(500).json({ message: 'Failed to deactivate content' });
  }
});

/**
 * GET /api/social/analytics
 * Get social media analytics by platform
 * Admin only
 */
socialRouter.get('/analytics', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform } = req.query;

  try {
    if (platform) {
      // Get analytics for specific platform
      const result = await pool.query(
        `SELECT 
          COUNT(sp.id) as total_posts,
          COALESCE(SUM(sa.likes), 0) as total_likes,
          COALESCE(SUM(sa.shares), 0) as total_shares,
          COALESCE(SUM(sa.clicks), 0) as total_clicks,
          COALESCE(SUM(sa.impressions), 0) as total_impressions,
          COALESCE(AVG(sa.engagement_rate), 0) as avg_engagement_rate
         FROM social_posts sp
         LEFT JOIN social_analytics sa ON sp.id = sa.post_id
         WHERE sp.platform = $1 AND sp.status = 'posted'`,
        [platform]
      );

      res.json({
        platform,
        metrics: result.rows[0],
      });
    } else {
      // Get analytics for all platforms
      const analytics = await getAllPlatformsAnalytics();

      res.json({
        platforms: analytics,
      });
    }
  } catch (error: any) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/social/cohorts
 * Get user acquisition cohorts by platform
 * Admin only
 */
socialRouter.get('/cohorts', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const cohorts = await getAllCohortsAnalytics();

    // Calculate ROI for each platform
    const cohortsWithROI = await Promise.all(
      cohorts.map(async (cohort) => {
        const roi = await calculatePlatformROI(cohort.acquisitionPlatform);
        return {
          ...cohort,
          roi: roi?.roi || 0,
        };
      })
    );

    res.json({
      cohorts: cohortsWithROI,
      total: cohorts.length,
    });
  } catch (error: any) {
    logger.error('Get cohorts error:', error);
    res.status(500).json({ message: 'Failed to fetch cohorts' });
  }
});

/**
 * POST /api/social/manual-post
 * Manually post content immediately
 * Admin only
 */
socialRouter.post('/manual-post', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { platform, content, mediaUrl, subreddit } = req.body;

  if (!platform || !content) {
    return res.status(400).json({ message: 'Platform and content required' });
  }

  try {
    let postId: string | null = null;

    // Schedule immediately (now)
    const now = new Date();

    if (platform === 'twitter') {
      postId = await scheduleTweet(undefined, now);
    } else if (platform === 'instagram') {
      postId = await scheduleInstagramStory(undefined, now);
    } else if (platform === 'reddit') {
      const targetSubreddit = subreddit || getRandomSubreddit();
      postId = await scheduleRedditPost(targetSubreddit, undefined, now);
    } else {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    if (!postId) {
      return res.status(500).json({ message: 'Failed to post' });
    }

    res.status(201).json({
      message: 'Post created successfully',
      postId,
      platform,
    });
  } catch (error: any) {
    logger.error('Manual post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

/**
 * GET /api/social/stats
 * Get overall social media statistics
 * Admin only
 */
socialRouter.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get post counts by platform and status
    const postsResult = await pool.query(`
      SELECT 
        platform,
        status,
        COUNT(*) as count
      FROM social_posts
      GROUP BY platform, status
      ORDER BY platform, status
    `);

    // Get total content pool size
    const contentResult = await pool.query(`
      SELECT 
        platform,
        COUNT(*) as count
      FROM social_content_pool
      WHERE is_active = TRUE
      GROUP BY platform
    `);

    // Get total user acquisition
    const cohortResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT user_id) FILTER (WHERE converted_to_premium = TRUE) as converted_users
      FROM social_user_cohorts
    `);

    res.json({
      posts: postsResult.rows,
      contentPool: contentResult.rows,
      userAcquisition: cohortResult.rows[0] || { total_users: 0, converted_users: 0 },
    });
  } catch (error: any) {
    logger.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});
