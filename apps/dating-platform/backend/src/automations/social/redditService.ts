import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { getRandomContent, renderContent, getDynamicVariables, buildUTMUrl } from './contentPoolService';

/**
 * Reddit Service
 * 
 * Handles ethical automated posting to Reddit communities
 * Features:
 * - Post to dating subreddits (r/dating, r/Tinder, r/OnlineDating, r/singlesover30)
 * - 80% value, 20% promotion (not spam)
 * - 2x weekly posting (Monday & Thursday 3pm EST)
 * - Community engagement (reply to comments)
 * - Karma building
 * 
 * IMPORTANT: Reddit has strict anti-spam rules. This service focuses on
 * providing genuine value to communities, not promotional spam.
 */

// Reddit API configuration
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';
const REDDIT_USER_AGENT = 'Trollz1004DatingApp/1.0';

// Target subreddits
const SUBREDDITS = [
  'dating', // 1.2M members
  'Tinder', // 800K members
  'OnlineDating', // 100K members
  'singlesover30', // 200K members
  'relationship_advice', // 9M members (post sparingly)
];

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface RedditSubmitResponse {
  json: {
    errors: any[];
    data?: {
      id: string;
      name: string;
      url: string;
    };
  };
}

/**
 * Authenticate with Reddit API
 */
const authenticateReddit = async (): Promise<string | null> => {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    logger.error('Reddit API credentials not configured');
    return null;
  }

  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: REDDIT_USERNAME,
        password: REDDIT_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.statusText}`);
    }

    const data = (await response.json()) as RedditAuthResponse;
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000; // Refresh 1 min early

    logger.info('Reddit authenticated successfully');
    return accessToken;
  } catch (error: any) {
    logger.error('Failed to authenticate with Reddit', { error: error.message });
    return null;
  }
};

/**
 * Submit post to Reddit subreddit
 */
export const submitRedditPost = async (
  subreddit: string,
  title: string,
  text: string,
  isLink: boolean = false
): Promise<string | null> => {
  // Check if Reddit posting is enabled
  if (process.env.ENABLE_REDDIT_POSTING !== 'true') {
    logger.info('Reddit posting disabled');
    return null;
  }

  try {
    const token = await authenticateReddit();
    if (!token) {
      throw new Error('Failed to authenticate with Reddit');
    }

    const payload: any = {
      sr: subreddit,
      kind: isLink ? 'link' : 'self',
      title: title.substring(0, 300), // Reddit title limit
    };

    if (isLink) {
      payload.url = text;
    } else {
      payload.text = text;
    }

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_USER_AGENT,
      },
      body: new URLSearchParams(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit API error: ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as RedditSubmitResponse;

    if (data.json.errors && data.json.errors.length > 0) {
      throw new Error(`Reddit errors: ${JSON.stringify(data.json.errors)}`);
    }

    const postId = data.json.data?.name;
    const postUrl = data.json.data?.url;

    logger.info('Reddit post submitted successfully', {
      subreddit,
      postId,
      postUrl,
      title: title.substring(0, 50),
    });

    await logAutomation({
      service: 'social',
      action: 'submit_reddit_post',
      status: 'success',
      details: { subreddit, postId, postUrl },
    });

    return postId || null;
  } catch (error: any) {
    logger.error('Failed to submit Reddit post', {
      error: error.message,
      subreddit,
      title: title.substring(0, 50),
    });

    await logAutomation({
      service: 'social',
      action: 'submit_reddit_post',
      status: 'failed',
      details: { subreddit, error: error.message },
    });

    return null;
  }
};

/**
 * Schedule Reddit post from content pool
 */
export const scheduleRedditPost = async (
  subreddit: string,
  contentType?: string,
  scheduledFor?: Date
): Promise<string | null> => {
  try {
    // Get random content from pool
    const content = await getRandomContent('reddit', contentType);

    if (!content) {
      logger.warn('No content available for Reddit');
      return null;
    }

    // Get dynamic variables
    const variables = await getDynamicVariables();

    // Render content with variables
    let postText = renderContent(content.contentText, variables);

    // Extract title from first line of content
    const lines = postText.split('\n');
    const title = lines[0].replace(/^#+\s*/, ''); // Remove markdown headers
    const body = lines.slice(1).join('\n').trim();

    // Add UTM-tracked link at the end (subtle, not spammy)
    if (content.callToAction) {
      const baseUrl = process.env.APP_URL || 'https://trollz1004.com';
      const trackedUrl = buildUTMUrl(
        baseUrl,
        content.utmParameters?.source || 'reddit',
        content.utmParameters?.medium || 'social',
        content.utmParameters?.campaign || 'community'
      );
      postText += `\n\n---\n\n${content.callToAction} [Link](${trackedUrl})`;
    }

    // Save to social_posts table
    const postResult = await pool.query(
      `INSERT INTO social_posts (
        platform, content_pool_id, content_text, scheduled_for, status, platform_response
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        'reddit',
        content.id,
        postText,
        scheduledFor || new Date(),
        'pending',
        JSON.stringify({ subreddit, title, body }),
      ]
    );

    const postId = postResult.rows[0].id;

    logger.info('Reddit post scheduled', {
      postId,
      contentId: content.id,
      subreddit,
      scheduledFor,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_reddit_post',
      status: 'success',
      details: { postId, contentId: content.id, subreddit },
    });

    return postId;
  } catch (error: any) {
    logger.error('Failed to schedule Reddit post', {
      error: error.message,
      subreddit,
      contentType,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_reddit_post',
      status: 'failed',
      details: { subreddit, contentType, error: error.message },
    });

    return null;
  }
};

/**
 * Process pending Reddit posts (called by cron job)
 */
export const processPendingRedditPosts = async (): Promise<void> => {
  try {
    // Get pending Reddit posts that are due
    const result = await pool.query(
      `SELECT * FROM social_posts 
       WHERE platform = 'reddit' 
         AND status = 'pending' 
         AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT 5` // Limit to 5 to avoid spamming
    );

    if (result.rows.length === 0) {
      logger.info('No pending Reddit posts to process');
      return;
    }

    logger.info(`Processing ${result.rows.length} pending Reddit posts`);

    for (const post of result.rows) {
      try {
        const platformData = post.platform_response;
        const subreddit = platformData.subreddit;
        const title = platformData.title;
        const body = platformData.body;

        // Submit to Reddit
        const redditPostId = await submitRedditPost(subreddit, title, body, false);

        if (redditPostId) {
          // Update post status
          await pool.query(
            `UPDATE social_posts 
             SET status = 'posted', 
                 post_id = $1, 
                 posted_at = NOW(),
                 external_url = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [redditPostId, `https://reddit.com/${redditPostId}`, post.id]
          );

          // Create analytics record
          await pool.query(
            `INSERT INTO social_analytics (post_id, platform)
             VALUES ($1, 'reddit')`,
            [post.id]
          );

          logger.info('Reddit post submitted and tracked', { postId: post.id, redditPostId });
        } else {
          // Mark as failed
          await pool.query(
            `UPDATE social_posts 
             SET status = 'failed', 
                 retry_count = retry_count + 1,
                 error_message = 'Failed to submit to Reddit',
                 updated_at = NOW()
             WHERE id = $1`,
            [post.id]
          );
        }

        // Delay between posts to respect Reddit rate limits (at least 2 minutes)
        await new Promise((resolve) => setTimeout(resolve, 120000));
      } catch (error: any) {
        logger.error('Failed to process Reddit post', {
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
      action: 'process_pending_reddit_posts',
      status: 'success',
      details: { processed: result.rows.length },
    });
  } catch (error: any) {
    logger.error('Failed to process pending Reddit posts', {
      error: error.message,
    });

    await logAutomation({
      service: 'social',
      action: 'process_pending_reddit_posts',
      status: 'failed',
      details: { error: error.message },
    });
  }
};

/**
 * Get random subreddit from list
 */
export const getRandomSubreddit = (): string => {
  return SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
};
