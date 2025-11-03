import pool from '../../database';
import logger from '../../logger';

export interface PremiumFeature {
  id?: string;
  feature_key: string;
  name: string;
  description?: string;
  required_tier: string;
  enabled?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Tier hierarchy: free < basic < premium < elite
const TIER_HIERARCHY: { [key: string]: number } = {
  free: 0,
  basic: 1,
  premium: 2,
  elite: 3,
};

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(
  userId: string,
  featureKey: string
): Promise<{ success: boolean; hasAccess?: boolean; error?: string }> {
  try {
    // Get user's subscription tier
    const userResult = await pool.query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const userTier = userResult.rows[0].subscription_tier || 'free';

    // Get feature requirements
    const featureResult = await pool.query(
      `SELECT * FROM premium_features WHERE feature_key = $1 AND enabled = TRUE`,
      [featureKey]
    );

    if (featureResult.rows.length === 0) {
      return { success: false, error: 'Feature not found or disabled' };
    }

    const feature = featureResult.rows[0];
    const requiredTier = feature.required_tier;

    // Check if user's tier is sufficient
    const hasAccess = TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];

    return { success: true, hasAccess };
  } catch (error: any) {
    logger.error('Failed to check feature access', { userId, featureKey, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all available features for user's tier
 */
export async function getAvailableFeatures(
  userId: string
): Promise<{ success: boolean; features?: PremiumFeature[]; error?: string }> {
  try {
    // Get user's subscription tier
    const userResult = await pool.query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const userTier = userResult.rows[0].subscription_tier || 'free';
    const userTierLevel = TIER_HIERARCHY[userTier];

    // Get all enabled features
    const featuresResult = await pool.query(
      `SELECT * FROM premium_features WHERE enabled = TRUE ORDER BY required_tier, name`
    );

    // Filter features based on user's tier
    const features = featuresResult.rows.map((feature) => ({
      ...feature,
      hasAccess: TIER_HIERARCHY[feature.required_tier] <= userTierLevel,
    }));

    return { success: true, features };
  } catch (error: any) {
    logger.error('Failed to get available features', { userId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all features (admin)
 */
export async function getAllFeatures(): Promise<{
  success: boolean;
  features?: PremiumFeature[];
  error?: string;
}> {
  try {
    const result = await pool.query(
      `SELECT * FROM premium_features ORDER BY required_tier, name`
    );

    return { success: true, features: result.rows };
  } catch (error: any) {
    logger.error('Failed to get all features', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Track feature usage for analytics
 */
export async function trackFeatureUsage(
  userId: string,
  featureKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has access first
    const accessCheck = await hasFeatureAccess(userId, featureKey);

    if (!accessCheck.success || !accessCheck.hasAccess) {
      return { success: false, error: 'Feature access denied' };
    }

    // Track usage
    await pool.query(
      `INSERT INTO feature_usage (user_id, feature_key) VALUES ($1, $2)`,
      [userId, featureKey]
    );

    logger.info('Feature usage tracked', { userId, featureKey });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to track feature usage', { userId, featureKey, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get feature usage statistics (admin)
 */
export async function getFeatureUsageStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  success: boolean;
  stats?: Array<{ feature_key: string; usage_count: number }>;
  error?: string;
}> {
  try {
    let query = `
      SELECT feature_key, COUNT(*) as usage_count
      FROM feature_usage
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND used_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND used_at <= $${params.length}`;
    }

    query += ' GROUP BY feature_key ORDER BY usage_count DESC';

    const result = await pool.query(query, params);

    return {
      success: true,
      stats: result.rows.map((row) => ({
        feature_key: row.feature_key,
        usage_count: parseInt(row.usage_count),
      })),
    };
  } catch (error: any) {
    logger.error('Failed to get feature usage stats', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update feature settings (admin)
 */
export async function updateFeature(
  featureKey: string,
  updates: {
    name?: string;
    description?: string;
    required_tier?: string;
    enabled?: boolean;
  }
): Promise<{ success: boolean; feature?: PremiumFeature; error?: string }> {
  try {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      params.push(updates.description);
    }

    if (updates.required_tier !== undefined) {
      updateFields.push(`required_tier = $${paramCount++}`);
      params.push(updates.required_tier);
    }

    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramCount++}`);
      params.push(updates.enabled);
    }

    if (updateFields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(featureKey);

    const query = `
      UPDATE premium_features
      SET ${updateFields.join(', ')}
      WHERE feature_key = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return { success: false, error: 'Feature not found' };
    }

    logger.info('Feature updated', { featureKey, updates });
    return { success: true, feature: result.rows[0] };
  } catch (error: any) {
    logger.error('Failed to update feature', { featureKey, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user's tier and features summary
 */
export async function getUserFeaturesSummary(
  userId: string
): Promise<{
  success: boolean;
  summary?: {
    tier: string;
    available_features: string[];
    locked_features: string[];
  };
  error?: string;
}> {
  try {
    // Get user's tier
    const userResult = await pool.query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const userTier = userResult.rows[0].subscription_tier || 'free';
    const userTierLevel = TIER_HIERARCHY[userTier];

    // Get all features
    const featuresResult = await pool.query(
      `SELECT feature_key, required_tier FROM premium_features WHERE enabled = TRUE`
    );

    const availableFeatures: string[] = [];
    const lockedFeatures: string[] = [];

    for (const feature of featuresResult.rows) {
      if (TIER_HIERARCHY[feature.required_tier] <= userTierLevel) {
        availableFeatures.push(feature.feature_key);
      } else {
        lockedFeatures.push(feature.feature_key);
      }
    }

    return {
      success: true,
      summary: {
        tier: userTier,
        available_features: availableFeatures,
        locked_features: lockedFeatures,
      },
    };
  } catch (error: any) {
    logger.error('Failed to get user features summary', { userId, error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  hasFeatureAccess,
  getAvailableFeatures,
  getAllFeatures,
  trackFeatureUsage,
  getFeatureUsageStats,
  updateFeature,
  getUserFeaturesSummary,
};
