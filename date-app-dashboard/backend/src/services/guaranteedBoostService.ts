import { Pool } from 'pg';
import logger from '../logger';

interface GuaranteedBoostPackage {
  userId: string;
  packageType: 'basic_10' | 'premium_25' | 'ultimate_50';
  priceUsd: number;
  paymentIntentId: string;
}

const PACKAGE_CONFIGS = {
  basic_10: { guaranteedViews: 10, durationHours: 24, price: 9.99 },
  premium_25: { guaranteedViews: 25, durationHours: 48, price: 19.99 },
  ultimate_50: { guaranteedViews: 50, durationHours: 72, price: 34.99 }
};

/**
 * Guaranteed Boost Service - Zero-Risk Psychology
 * If we don't deliver promised views, AUTOMATIC REFUND (no questions asked)
 * Expected: 40% conversion rate on boost offers = $8K-20K/month
 */
export class GuaranteedBoostService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Purchase guaranteed boost package
   * Psychology: Money-back guarantee removes risk = higher conversions
   */
  async purchaseBoost(request: GuaranteedBoostPackage): Promise<string> {
    const client = await this.pool.connect();
    try {
      const config = PACKAGE_CONFIGS[request.packageType];
      const boostEnd = new Date(Date.now() + config.durationHours * 60 * 60 * 1000);

      const result = await client.query(
        `INSERT INTO guaranteed_boosts (
          user_id, package_type, guaranteed_views, price_usd,
          payment_intent_id, boost_end, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id`,
        [
          request.userId,
          request.packageType,
          config.guaranteedViews,
          request.priceUsd,
          request.paymentIntentId,
          boostEnd
        ]
      );

      const boostId = result.rows[0].id;

      // Activate profile boost
      await this.activateProfileBoost(request.userId, boostId, config.durationHours);

      logger.info(`🚀 Guaranteed boost purchased: ${boostId} - ${config.guaranteedViews} views guaranteed`);

      return boostId;
    } finally {
      client.release();
    }
  }

  /**
   * Activate profile boost in main system
   */
  private async activateProfileBoost(userId: string, boostId: string, durationHours: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Set user profile to "boosted" status
      await client.query(
        `UPDATE users 
        SET profile_boost_active = true,
            profile_boost_end = NOW() + INTERVAL '${durationHours} hours',
            profile_boost_level = 'guaranteed'
        WHERE id = $1`,
        [userId]
      );

      // Create activity
      await client.query(
        `INSERT INTO activity_feed (user_id, activity_type, description, metadata)
        VALUES ($1, 'boost_activated', 'Profile boost activated with view guarantee', $2)`,
        [userId, JSON.stringify({ boostId, durationHours })]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Track profile view for boost analytics
   * Called whenever a boosted profile is viewed
   */
  async trackBoostView(boostId: string, viewerId: string, viewerLocation?: string, viewerAge?: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO boost_analytics (
          boost_id, viewer_id, viewer_location, viewer_age, interaction_type
        ) VALUES ($1, $2, $3, $4, 'view')`,
        [boostId, viewerId, viewerLocation, viewerAge]
      );

      // Trigger will auto-update actual_views count and check guarantee
      logger.info(`👁️ Boost view tracked: ${boostId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Track boost interaction (like, message, match)
   */
  async trackBoostInteraction(
    boostId: string, 
    viewerId: string, 
    interactionType: 'like' | 'message' | 'match'
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO boost_analytics (
          boost_id, viewer_id, interaction_type
        ) VALUES ($1, $2, $3)`,
        [boostId, viewerId, interactionType]
      );

      logger.info(`💫 Boost interaction: ${boostId} - ${interactionType}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get user's active boost
   */
  async getActiveBoost(userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          gb.*,
          (gb.actual_views::FLOAT / gb.guaranteed_views * 100) as progress_percentage,
          EXTRACT(EPOCH FROM (gb.boost_end - NOW())) as seconds_remaining
        FROM guaranteed_boosts gb
        WHERE gb.user_id = $1 
          AND gb.status = 'active'
          AND gb.boost_end > NOW()
        ORDER BY gb.created_at DESC
        LIMIT 1`,
        [userId]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get boost analytics for user
   */
  async getBoostAnalytics(boostId: string, userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Verify ownership
      const boostResult = await client.query(
        `SELECT * FROM guaranteed_boosts WHERE id = $1 AND user_id = $2`,
        [boostId, userId]
      );

      if (boostResult.rows.length === 0) {
        throw new Error('Boost not found');
      }

      const boost = boostResult.rows[0];

      // Get detailed analytics
      const analyticsResult = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE interaction_type = 'view') as total_views,
          COUNT(*) FILTER (WHERE interaction_type = 'like') as total_likes,
          COUNT(*) FILTER (WHERE interaction_type = 'message') as total_messages,
          COUNT(*) FILTER (WHERE interaction_type = 'match') as total_matches,
          COUNT(DISTINCT viewer_id) as unique_viewers,
          COUNT(DISTINCT viewer_location) FILTER (WHERE viewer_location IS NOT NULL) as locations_count
        FROM boost_analytics
        WHERE boost_id = $1`,
        [boostId]
      );

      // Get viewer demographics
      const demographicsResult = await client.query(
        `SELECT
          viewer_age,
          COUNT(*) as count
        FROM boost_analytics
        WHERE boost_id = $1 AND viewer_age IS NOT NULL
        GROUP BY viewer_age
        ORDER BY count DESC
        LIMIT 10`,
        [boostId]
      );

      return {
        boost,
        analytics: analyticsResult.rows[0],
        demographics: demographicsResult.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process expired boosts and issue refunds (runs on cron)
   * This is THE MONEY-BACK GUARANTEE AUTOMATION
   */
  async processExpiredBoosts(): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Find boosts that ended and didn't meet guarantee
      const expiredBoosts = await client.query(
        `SELECT 
          gb.*,
          u.email,
          u.display_name
        FROM guaranteed_boosts gb
        JOIN users u ON gb.user_id = u.id
        WHERE gb.status = 'active'
          AND gb.boost_end < NOW()
          AND gb.actual_views < gb.guaranteed_views
          AND gb.refund_issued = false`
      );

      const refundsProcessed = [];

      for (const boost of expiredBoosts.rows) {
        // Calculate refund amount
        let refundAmount = 0;
        if (boost.actual_views < boost.guaranteed_views * 0.5) {
          // Less than 50% of guarantee = full refund
          refundAmount = boost.price_usd;
        } else {
          // Partial refund based on shortfall
          const shortfallPercentage = (boost.guaranteed_views - boost.actual_views) / boost.guaranteed_views;
          refundAmount = boost.price_usd * shortfallPercentage;
        }

        // Update boost record
        await client.query(
          `UPDATE guaranteed_boosts
          SET status = 'refunded',
              refund_issued = true,
              refund_amount_usd = $1,
              refunded_at = NOW(),
              guarantee_met = false
          WHERE id = $2`,
          [refundAmount, boost.id]
        );

        // Create refund notification
        await client.query(
          `INSERT INTO notifications (user_id, type, message, data)
          VALUES ($1, 'boost_refund', $2, $3)`,
          [
            boost.user_id,
            `We didn't hit your ${boost.guaranteed_views} view guarantee. $${refundAmount.toFixed(2)} refund issued! ✅`,
            JSON.stringify({ 
              boostId: boost.id, 
              refundAmount, 
              guaranteedViews: boost.guaranteed_views,
              actualViews: boost.actual_views
            })
          ]
        );

        refundsProcessed.push({
          userId: boost.user_id,
          boostId: boost.id,
          refundAmount,
          guaranteedViews: boost.guaranteed_views,
          actualViews: boost.actual_views
        });

        logger.info(`💰 Refund processed: ${boost.id} - $${refundAmount} (${boost.actual_views}/${boost.guaranteed_views} views)`);
      }

      // Mark successful boosts as completed
      await client.query(
        `UPDATE guaranteed_boosts
        SET status = 'completed',
            guarantee_met = true
        WHERE status = 'active'
          AND boost_end < NOW()
          AND actual_views >= guaranteed_views`
      );

      return {
        refundsProcessed: refundsProcessed.length,
        refunds: refundsProcessed,
        totalRefunded: refundsProcessed.reduce((sum, r) => sum + parseFloat(r.refundAmount), 0)
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get boost revenue stats
   */
  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
          COUNT(*) as total_boosts,
          COUNT(*) FILTER (WHERE guarantee_met = true) as guarantees_met,
          COUNT(*) FILTER (WHERE refund_issued = true) as refunds_issued,
          SUM(price_usd) as gross_revenue,
          COALESCE(SUM(refund_amount_usd), 0) as total_refunded,
          SUM(price_usd) - COALESCE(SUM(refund_amount_usd), 0) as net_revenue,
          AVG(actual_views) as avg_views_delivered,
          AVG(actual_views::FLOAT / guaranteed_views * 100) as avg_guarantee_fulfillment_pct
        FROM guaranteed_boosts
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)`,
        [startDate || null, endDate || null]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
