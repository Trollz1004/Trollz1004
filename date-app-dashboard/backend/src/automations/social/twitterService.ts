import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { getRandomContent, renderContent, getDynamicVariables, buildUTMUrl } from './contentPoolService';

/**
 * Twitter/X Service
 * 
 * Handles automated posting to Twitter using Twitter API v2
 * Features:
 * - Schedule tweets (4x daily: 8am, 12pm, 4pm, 8pm EST)
 * - UTM tracking for link clicks
 * - Rate limiting (450 requests per 15 min)
 * - Hashtag optimization
 * - Thread support
 */

// Twitter API v2 configuration
const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';

// Rate limiting
let requestCount = 0;
let rateLimitResetTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now

interface TweetResponse {
  data?: {
    id: string;
    text: string;
  };
  errors?: any[];
}

/**
 * Post tweet to Twitter
 */
export const postTweet = async (text: string, mediaIds?: string[]): Promise<string | null> => {
  // Check if Twitter is enabled
  if (process.env.ENABLE_TWITTER_POSTING !== 'true') {
    logger.info('Twitter posting disabled');
    return null;
  }

  // Check rate limit
  if (!checkRateLimit()) {
    logger.warn('Twitter rate limit reached, skipping post');
    return null;
  }

  try {
    // Truncate text to 280 characters (Twitter limit)
    const tweetText = text.length > 280 ? text.substring(0, 277) + '...' : text;

    const payload: any = { text: tweetText };
    if (mediaIds && mediaIds.length > 0) {
      payload.media = { media_ids: mediaIds };
    }

    // Use Twitter API v2 to create tweet
    const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    incrementRequestCount();

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twitter API error: ${JSON.stringify(errorData)}`);
    }

    const data: TweetResponse = await response.json();

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Twitter API errors: ${JSON.stringify(data.errors)}`);
    }

    const tweetId = data.data?.id;

    logger.info('Tweet posted successfully', {
      tweetId,
      text: tweetText.substring(0, 50) + '...',
    });

    await logAutomation({
      service: 'social',
      action: 'post_tweet',
      status: 'success',
      details: { tweetId, textLength: tweetText.length },
    });

    return tweetId || null;
  } catch (error: any) {
    logger.error('Failed to post tweet', {
      error: error.message,
      text: text.substring(0, 50),
    });

    await logAutomation({
      service: 'social',
      action: 'post_tweet',
      status: 'failed',
      details: { error: error.message },
    });

    return null;
  }
};

/**
 * Schedule tweet from content pool
 */
export const scheduleTweet = async (
  contentType?: string,
  scheduledFor?: Date
): Promise<string | null> => {
  try {
    // Get random content from pool
    const content = await getRandomContent('twitter', contentType);

    if (!content) {
      logger.warn('No content available for Twitter');
      return null;
    }

    // Get dynamic variables
    const variables = await getDynamicVariables();

    // Render content with variables
    let tweetText = renderContent(content.contentText, variables);

    // Add hashtags if present
    if (content.hashtags) {
      tweetText += `\n\n${content.hashtags}`;
    }

    // Add UTM-tracked link if CTA present
    if (content.callToAction) {
      const baseUrl = process.env.APP_URL || 'https://trollz1004.com';
      const trackedUrl = buildUTMUrl(
        baseUrl,
        content.utmParameters?.source || 'twitter',
        content.utmParameters?.medium || 'social',
        content.utmParameters?.campaign || 'growth'
      );
      tweetText += `\n\n${content.callToAction} ${trackedUrl}`;
    }

    // Save to social_posts table
    const postResult = await pool.query(
      `INSERT INTO social_posts (
        platform, content_pool_id, content_text, scheduled_for, status
      )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['twitter', content.id, tweetText, scheduledFor || new Date(), 'pending']
    );

    const postId = postResult.rows[0].id;

    logger.info('Tweet scheduled', {
      postId,
      contentId: content.id,
      scheduledFor,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_tweet',
      status: 'success',
      details: { postId, contentId: content.id },
    });

    return postId;
  } catch (error: any) {
    logger.error('Failed to schedule tweet', {
      error: error.message,
      contentType,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_tweet',
      status: 'failed',
      details: { contentType, error: error.message },
    });

    return null;
  }
};

/**
 * Process pending tweets (called by cron job)
 */
export const processPendingTweets = async (): Promise<void> => {
  try {
    // Get pending tweets that are due to post
    const result = await pool.query(
      `SELECT * FROM social_posts 
       WHERE platform = 'twitter' 
         AND status = 'pending' 
         AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT 10`
    );

    if (result.rows.length === 0) {
      logger.info('No pending tweets to process');
      return;
    }

    logger.info(`Processing ${result.rows.length} pending tweets`);

    for (const post of result.rows) {
      try {
        // Post tweet
        const tweetId = await postTweet(post.content_text);

        if (tweetId) {
          // Update post status
          await pool.query(
            `UPDATE social_posts 
             SET status = 'posted', 
                 post_id = $1, 
                 posted_at = NOW(),
                 external_url = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [tweetId, `https://twitter.com/user/status/${tweetId}`, post.id]
          );

          // Create analytics record
          await pool.query(
            `INSERT INTO social_analytics (post_id, platform)
             VALUES ($1, 'twitter')`,
            [post.id]
          );

          logger.info('Tweet posted and tracked', { postId: post.id, tweetId });
        } else {
          // Mark as failed
          await pool.query(
            `UPDATE social_posts 
             SET status = 'failed', 
                 retry_count = retry_count + 1,
                 error_message = 'Failed to post tweet',
                 updated_at = NOW()
             WHERE id = $1`,
            [post.id]
          );
        }

        // Small delay between tweets to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        logger.error('Failed to process tweet', {
          postId: post.id,
          error: error.message,
        });

        // Update retry count
        await pool.query(
          `UPDATE social_posts 
           SET retry_count = retry_count + 1,
               error_message = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [error.message, post.id]
        );
      }
    }

    await logAutomation({
      service: 'social',
      action: 'process_pending_tweets',
      status: 'success',
      details: { processed: result.rows.length },
    });
  } catch (error: any) {
    logger.error('Failed to process pending tweets', {
      error: error.message,
    });

    await logAutomation({
      service: 'social',
      action: 'process_pending_tweets',
      status: 'failed',
      details: { error: error.message },
    });
  }
};

/**
 * Check Twitter API rate limit
 */
const checkRateLimit = (): boolean => {
  const now = Date.now();

  // Reset counter if 15 minutes passed
  if (now > rateLimitResetTime) {
    requestCount = 0;
    rateLimitResetTime = now + 15 * 60 * 1000;
  }

  // Twitter API allows 450 requests per 15 minutes
  return requestCount < 450;
};

/**
 * Increment rate limit counter
 */
const incrementRequestCount = (): void => {
  requestCount++;
};

/**
 * Get tweet analytics (mock - would need Twitter API Premium for real data)
 */
export const fetchTweetAnalytics = async (tweetId: string): Promise<void> => {
  // Note: Twitter API v2 Basic doesn't provide analytics
  // This is a placeholder for when you upgrade to Premium API
  logger.info('Tweet analytics fetch not implemented (requires Premium API)', { tweetId });
};
