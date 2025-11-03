import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';

/**
 * Content Pool Service
 * 
 * Manages social media content templates for auto-posting
 * Features:
 * - Random content rotation (avoid repeats)
 * - Variable substitution ({{userName}}, {{userCount}}, etc.)
 * - A/B testing tracking
 * - Content performance analysis
 */

interface ContentTemplate {
  id: string;
  platform: string;
  contentType: string;
  contentText: string;
  mediaUrl?: string;
  hashtags?: string;
  callToAction?: string;
  utmParameters?: {
    source: string;
    medium: string;
    campaign: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContentVariables {
  [key: string]: string | number;
}

// Cache for recently used content IDs to avoid repeats
const recentlyUsedCache = new Map<string, Set<string>>();
const CACHE_SIZE = 10; // Don't repeat last 10 posts per platform

/**
 * Get random active content from pool for a platform
 */
export const getRandomContent = async (
  platform: string,
  contentType?: string
): Promise<ContentTemplate | null> => {
  try {
    let query = `
      SELECT * FROM social_content_pool
      WHERE platform = $1 AND is_active = TRUE
    `;
    const params: any[] = [platform];

    if (contentType) {
      query += ` AND content_type = $2`;
      params.push(contentType);
    }

    query += ` ORDER BY RANDOM() LIMIT 20`; // Get 20 random, then filter out recently used

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      logger.warn(`No active content found for platform: ${platform}`);
      return null;
    }

    // Filter out recently used content
    const cacheKey = `${platform}:${contentType || 'all'}`;
    const recentlyUsed = recentlyUsedCache.get(cacheKey) || new Set();

    const availableContent = result.rows.filter((row) => !recentlyUsed.has(row.id));

    // If all content was recently used, clear cache and use any
    const selectedContent = availableContent.length > 0 ? availableContent[0] : result.rows[0];

    // Update cache
    recentlyUsed.add(selectedContent.id);
    if (recentlyUsed.size > CACHE_SIZE) {
      const firstId = recentlyUsed.values().next().value;
      recentlyUsed.delete(firstId);
    }
    recentlyUsedCache.set(cacheKey, recentlyUsed);

    logger.info(`Selected content from pool`, {
      platform,
      contentType,
      contentId: selectedContent.id,
    });

    return selectedContent as ContentTemplate;
  } catch (error: any) {
    logger.error(`Failed to get random content`, {
      platform,
      contentType,
      error: error.message,
    });

    await logAutomation({
      service: 'social',
      action: 'get_random_content',
      status: 'failed',
      details: { platform, contentType, error: error.message },
    });

    return null;
  }
};

/**
 * Render content with variable substitution
 * Example: "Welcome {{userName}}! Join {{userCount}} singles" 
 * → "Welcome John! Join 5000 singles"
 */
export const renderContent = (contentText: string, variables: ContentVariables): string => {
  let rendered = contentText;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }

  return rendered;
};

/**
 * Get dynamic variables for content rendering
 */
export const getDynamicVariables = async (): Promise<ContentVariables> => {
  try {
    // Get total user count
    const userCountResult = await pool.query(`SELECT COUNT(*) as count FROM users`);
    const userCount = parseInt(userCountResult.rows[0]?.count || '0', 10);

    // Get today's match count
    const todayMatchesResult = await pool.query(`
      SELECT COUNT(*) as count FROM matches 
      WHERE created_at > NOW() - INTERVAL '1 day'
    `);
    const todayMatches = parseInt(todayMatchesResult.rows[0]?.count || '0', 10);

    // Get active users (logged in last 7 days)
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM sessions 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    const activeUsers = parseInt(activeUsersResult.rows[0]?.count || '0', 10);

    // Get premium subscribers
    const premiumUsersResult = await pool.query(`
      SELECT COUNT(*) as count FROM subscriptions 
      WHERE status = 'active'
    `);
    const premiumUsers = parseInt(premiumUsersResult.rows[0]?.count || '0', 10);

    const variables: ContentVariables = {
      userCount: userCount.toLocaleString(),
      todayMatches: todayMatches.toLocaleString(),
      activeUsers: activeUsers.toLocaleString(),
      premiumUsers: premiumUsers.toLocaleString(),
      currentDate: new Date().toLocaleDateString(),
      currentMonth: new Date().toLocaleString('default', { month: 'long' }),
      currentYear: new Date().getFullYear(),
    };

    return variables;
  } catch (error: any) {
    logger.error('Failed to get dynamic variables', { error: error.message });
    
    // Return defaults on error
    return {
      userCount: '1000+',
      todayMatches: '100+',
      activeUsers: '500+',
      premiumUsers: '50+',
      currentDate: new Date().toLocaleDateString(),
      currentMonth: new Date().toLocaleString('default', { month: 'long' }),
      currentYear: new Date().getFullYear(),
    };
  }
};

/**
 * Add new content to pool
 */
export const addContent = async (content: {
  platform: string;
  contentType: string;
  contentText: string;
  mediaUrl?: string;
  hashtags?: string;
  callToAction?: string;
  utmParameters?: object;
  createdBy?: string;
}): Promise<string> => {
  try {
    const result = await pool.query(
      `INSERT INTO social_content_pool (
        platform, content_type, content_text, media_url, hashtags, 
        call_to_action, utm_parameters, created_by, is_active
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id`,
      [
        content.platform,
        content.contentType,
        content.contentText,
        content.mediaUrl || null,
        content.hashtags || null,
        content.callToAction || null,
        content.utmParameters ? JSON.stringify(content.utmParameters) : null,
        content.createdBy || 'system',
      ]
    );

    const contentId = result.rows[0].id;

    logger.info('Content added to pool', {
      contentId,
      platform: content.platform,
      contentType: content.contentType,
    });

    await logAutomation({
      service: 'social',
      action: 'add_content',
      status: 'success',
      details: { contentId, platform: content.platform },
    });

    return contentId;
  } catch (error: any) {
    logger.error('Failed to add content to pool', {
      error: error.message,
      platform: content.platform,
    });

    await logAutomation({
      service: 'social',
      action: 'add_content',
      status: 'failed',
      details: { platform: content.platform, error: error.message },
    });

    throw error;
  }
};

/**
 * Get all content for a platform
 */
export const getContentByPlatform = async (
  platform: string,
  activeOnly: boolean = true
): Promise<ContentTemplate[]> => {
  try {
    let query = `SELECT * FROM social_content_pool WHERE platform = $1`;
    if (activeOnly) {
      query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, [platform]);

    return result.rows as ContentTemplate[];
  } catch (error: any) {
    logger.error('Failed to get content by platform', {
      platform,
      error: error.message,
    });
    return [];
  }
};

/**
 * Deactivate content (soft delete)
 */
export const deactivateContent = async (contentId: string): Promise<void> => {
  try {
    await pool.query(
      `UPDATE social_content_pool SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [contentId]
    );

    logger.info('Content deactivated', { contentId });

    await logAutomation({
      service: 'social',
      action: 'deactivate_content',
      status: 'success',
      details: { contentId },
    });
  } catch (error: any) {
    logger.error('Failed to deactivate content', {
      contentId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Build UTM tracking URL
 */
export const buildUTMUrl = (
  baseUrl: string,
  source: string,
  medium: string = 'social',
  campaign: string = 'growth'
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
};
