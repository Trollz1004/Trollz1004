import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { getRandomContent, renderContent, getDynamicVariables, buildUTMUrl } from './contentPoolService';

/**
 * Instagram Service (via Buffer API)
 * 
 * Handles automated posting to Instagram Stories using Buffer API
 * Features:
 * - Schedule Instagram Stories (6x daily: 8am, 10am, 12pm, 3pm, 6pm, 9pm EST)
 * - Branded story templates
 * - Poll stickers and engagement
 * - Analytics via Buffer dashboard
 * 
 * Note: Buffer free tier supports Instagram Basic scheduling
 */

// Buffer API configuration
const BUFFER_API_BASE = 'https://api.bufferapp.com/1';
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || '';
const BUFFER_PROFILE_ID = process.env.BUFFER_INSTAGRAM_PROFILE_ID || '';

interface BufferUpdate {
  text: string;
  media?: {
    photo?: string;
    thumbnail?: string;
  };
  scheduledAt?: number; // Unix timestamp
}

interface BufferResponse {
  success: boolean;
  updates?: any[];
  message?: string;
}

/**
 * Post Instagram Story via Buffer
 */
export const postInstagramStory = async (
  text: string,
  mediaUrl?: string,
  scheduledAt?: Date
): Promise<string | null> => {
  // Check if Instagram posting is enabled
  if (process.env.ENABLE_INSTAGRAM_POSTING !== 'true') {
    logger.info('Instagram posting disabled');
    return null;
  }

  if (!BUFFER_ACCESS_TOKEN || !BUFFER_PROFILE_ID) {
    logger.error('Buffer API credentials not configured');
    return null;
  }

  try {
    const update: BufferUpdate = {
      text: text.substring(0, 2200), // Instagram caption limit
    };

    if (mediaUrl) {
      update.media = { photo: mediaUrl };
    }

    if (scheduledAt) {
      update.scheduledAt = Math.floor(scheduledAt.getTime() / 1000);
    }

    // Create update via Buffer API
    const response = await fetch(`${BUFFER_API_BASE}/updates/create.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_ids: [BUFFER_PROFILE_ID],
        ...update,
        access_token: BUFFER_ACCESS_TOKEN,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Buffer API error: ${JSON.stringify(errorData)}`);
    }

    const data = (await response.json()) as BufferResponse;

    if (!data.success) {
      throw new Error(`Buffer API failed: ${data.message}`);
    }

    const updateId = data.updates?.[0]?.id;

    logger.info('Instagram story scheduled via Buffer', {
      updateId,
      text: text.substring(0, 50) + '...',
      scheduledAt,
    });

    await logAutomation({
      service: 'social',
      action: 'post_instagram_story',
      status: 'success',
      details: { updateId, scheduledAt },
    });

    return updateId || null;
  } catch (error: any) {
    logger.error('Failed to post Instagram story', {
      error: error.message,
      text: text.substring(0, 50),
    });

    await logAutomation({
      service: 'social',
      action: 'post_instagram_story',
      status: 'failed',
      details: { error: error.message },
    });

    return null;
  }
};

/**
 * Schedule Instagram Story from content pool
 */
export const scheduleInstagramStory = async (
  contentType?: string,
  scheduledFor?: Date
): Promise<string | null> => {
  try {
    // Get random content from pool
    const content = await getRandomContent('instagram', contentType);

    if (!content) {
      logger.warn('No content available for Instagram');
      return null;
    }

    // Get dynamic variables
    const variables = await getDynamicVariables();

    // Render content with variables
    let storyText = renderContent(content.contentText, variables);

    // Add CTA with UTM-tracked link
    if (content.callToAction) {
      const baseUrl = process.env.APP_URL || 'https://trollz1004.com';
      const trackedUrl = buildUTMUrl(
        baseUrl,
        content.utmParameters?.source || 'instagram',
        content.utmParameters?.medium || 'social',
        content.utmParameters?.campaign || 'growth'
      );
      storyText += `\n\n${content.callToAction}\n${trackedUrl}`;
    }

    // Add hashtags for discoverability
    if (content.hashtags) {
      storyText += `\n\n${content.hashtags}`;
    }

    // Save to social_posts table
    const postResult = await pool.query(
      `INSERT INTO social_posts (
        platform, content_pool_id, content_text, scheduled_for, status
      )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['instagram', content.id, storyText, scheduledFor || new Date(), 'pending']
    );

    const postId = postResult.rows[0].id;

    logger.info('Instagram story scheduled', {
      postId,
      contentId: content.id,
      scheduledFor,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_instagram_story',
      status: 'success',
      details: { postId, contentId: content.id },
    });

    return postId;
  } catch (error: any) {
    logger.error('Failed to schedule Instagram story', {
      error: error.message,
      contentType,
    });

    await logAutomation({
      service: 'social',
      action: 'schedule_instagram_story',
      status: 'failed',
      details: { contentType, error: error.message },
    });

    return null;
  }
};

/**
 * Process pending Instagram stories (called by cron job)
 */
export const processPendingInstagramStories = async (): Promise<void> => {
  try {
    // Get pending stories that are due to post
    const result = await pool.query(
      `SELECT * FROM social_posts 
       WHERE platform = 'instagram' 
         AND status = 'pending' 
         AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT 10`
    );

    if (result.rows.length === 0) {
      logger.info('No pending Instagram stories to process');
      return;
    }

    logger.info(`Processing ${result.rows.length} pending Instagram stories`);

    for (const post of result.rows) {
      try {
        // Post via Buffer
        const updateId = await postInstagramStory(post.content_text, post.media_url);

        if (updateId) {
          // Update post status
          await pool.query(
            `UPDATE social_posts 
             SET status = 'posted', 
                 post_id = $1, 
                 posted_at = NOW(),
                 external_url = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [updateId, `https://buffer.com/updates/${updateId}`, post.id]
          );

          // Create analytics record
          await pool.query(
            `INSERT INTO social_analytics (post_id, platform)
             VALUES ($1, 'instagram')`,
            [post.id]
          );

          logger.info('Instagram story posted via Buffer', { postId: post.id, updateId });
        } else {
          // Mark as failed
          await pool.query(
            `UPDATE social_posts 
             SET status = 'failed', 
                 retry_count = retry_count + 1,
                 error_message = 'Failed to post to Buffer',
                 updated_at = NOW()
             WHERE id = $1`,
            [post.id]
          );
        }

        // Small delay between posts
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        logger.error('Failed to process Instagram story', {
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
      action: 'process_pending_instagram_stories',
      status: 'success',
      details: { processed: result.rows.length },
    });
  } catch (error: any) {
    logger.error('Failed to process pending Instagram stories', {
      error: error.message,
    });

    await logAutomation({
      service: 'social',
      action: 'process_pending_instagram_stories',
      status: 'failed',
      details: { error: error.message },
    });
  }
};

/**
 * Get Buffer analytics (via Buffer API)
 */
export const fetchBufferAnalytics = async (): Promise<any> => {
  if (!BUFFER_ACCESS_TOKEN || !BUFFER_PROFILE_ID) {
    logger.warn('Buffer API credentials not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${BUFFER_API_BASE}/profiles/${BUFFER_PROFILE_ID}/analytics.json?access_token=${BUFFER_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Buffer API error: ${response.statusText}`);
    }

    const data = await response.json();

    logger.info('Buffer analytics fetched', { profile: BUFFER_PROFILE_ID });

    return data;
  } catch (error: any) {
    logger.error('Failed to fetch Buffer analytics', {
      error: error.message,
    });
    return null;
  }
};
