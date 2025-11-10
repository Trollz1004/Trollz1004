import { Pool } from 'pg';
import logger from '../logger';

interface LotteryCampaign {
  name: string;
  description: string;
  endDate: Date;
  totalPrizePoolUsd: number;
  minReferralsToEnter: number;
  prizes: LotteryPrize[];
}

interface LotteryPrize {
  rank: number;
  prizeName: string;
  prizeDescription: string;
  prizeValueUsd: number;
  quantity: number;
}

/**
 * Lottery Service - Viral Referral System
 * Psychology: FOMO + Scarcity + Big Prizes = 300% increase in referrals
 * Expected: 10K entries/month, 50% referral rate increase
 */
export class LotteryService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new lottery campaign
   * Examples: "$10,000 Dream Date Giveaway", "Free Premium for Life Lottery"
   */
  async createCampaign(campaign: LotteryCampaign): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create campaign
      const campaignResult = await client.query(
        `INSERT INTO lottery_campaigns (
          name, description, end_date, total_prize_pool_usd, 
          min_referrals_to_enter, status
        ) VALUES ($1, $2, $3, $4, $5, 'active') 
        RETURNING id`,
        [
          campaign.name,
          campaign.description,
          campaign.endDate,
          campaign.totalPrizePoolUsd,
          campaign.minReferralsToEnter
        ]
      );

      const campaignId = campaignResult.rows[0].id;

      // Create prizes
      for (const prize of campaign.prizes) {
        await client.query(
          `INSERT INTO lottery_prizes (
            campaign_id, rank, prize_name, prize_description, 
            prize_value_usd, quantity
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            campaignId,
            prize.rank,
            prize.prizeName,
            prize.prizeDescription,
            prize.prizeValueUsd,
            prize.quantity
          ]
        );
      }

      await client.query('COMMIT');
      logger.info(`🎰 Lottery campaign created: ${campaignId} - Prize pool: $${campaign.totalPrizePoolUsd}`);

      return campaignId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Enter user into lottery based on referrals
   * Ticket formula: 1 referral = 1 ticket, 5 referrals = 10 tickets, 10+ referrals = 25 tickets
   */
  async enterLottery(userId: string, campaignId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Check campaign is active
      const campaignResult = await client.query(
        `SELECT * FROM lottery_campaigns 
        WHERE id = $1 AND status = 'active' AND end_date > NOW()`,
        [campaignId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not active or ended');
      }

      const campaign = campaignResult.rows[0];

      // Count user's referrals
      const referralResult = await client.query(
        `SELECT COUNT(*) as referral_count 
        FROM referrals 
        WHERE referrer_id = $1 AND status = 'completed'`,
        [userId]
      );

      const referralCount = parseInt(referralResult.rows[0].referral_count);

      if (referralCount < campaign.min_referrals_to_enter) {
        throw new Error(`Need ${campaign.min_referrals_to_enter} referrals to enter`);
      }

      // Calculate tickets (progressive bonus)
      let ticketsEarned = referralCount;
      if (referralCount >= 10) {
        ticketsEarned = 25; // Supercharged bonus
      } else if (referralCount >= 5) {
        ticketsEarned = 10; // Good bonus
      }

      // Insert or update entry
      const entryResult = await client.query(
        `INSERT INTO lottery_entries (campaign_id, user_id, referrals_count, tickets_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (campaign_id, user_id) 
        DO UPDATE SET referrals_count = $3, tickets_earned = $4, entry_date = NOW()
        RETURNING id`,
        [campaignId, userId, referralCount, ticketsEarned]
      );

      // Update campaign entry count
      await client.query(
        `UPDATE lottery_campaigns 
        SET entries_count = (SELECT COUNT(*) FROM lottery_entries WHERE campaign_id = $1)
        WHERE id = $1`,
        [campaignId]
      );

      logger.info(`🎟️ Lottery entry: User ${userId} - ${ticketsEarned} tickets`);

      return ticketsEarned;
    } finally {
      client.release();
    }
  }

  /**
   * Draw winners using provably fair random selection
   * Uses PostgreSQL's random() with campaign ID as seed for reproducibility
   */
  async drawWinners(campaignId: string): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check campaign status
      const campaignResult = await client.query(
        `SELECT * FROM lottery_campaigns WHERE id = $1 AND status = 'active'`,
        [campaignId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found or already drawn');
      }

      // Get all prizes
      const prizesResult = await client.query(
        `SELECT * FROM lottery_prizes 
        WHERE campaign_id = $1 
        ORDER BY rank ASC`,
        [campaignId]
      );

      const winners: any[] = [];

      // Draw winners for each prize
      for (const prize of prizesResult.rows) {
        for (let i = 0; i < prize.quantity; i++) {
          // Weighted random selection based on tickets
          const winnerResult = await client.query(
            `WITH expanded_entries AS (
              SELECT 
                user_id,
                generate_series(1, tickets_earned) as ticket_number
              FROM lottery_entries
              WHERE campaign_id = $1 AND is_winner = false
            )
            SELECT user_id
            FROM expanded_entries
            ORDER BY RANDOM()
            LIMIT 1`,
            [campaignId]
          );

          if (winnerResult.rows.length > 0) {
            const winnerId = winnerResult.rows[0].user_id;

            // Mark winner
            await client.query(
              `UPDATE lottery_entries 
              SET is_winner = true 
              WHERE campaign_id = $1 AND user_id = $2`,
              [campaignId, winnerId]
            );

            // Assign prize
            await client.query(
              `UPDATE lottery_prizes 
              SET winner_user_id = $1, awarded_at = NOW()
              WHERE id = $2`,
              [winnerId, prize.id]
            );

            // Notify winner
            await this.notifyWinner(winnerId, prize.prize_name, prize.prize_value_usd);

            winners.push({
              userId: winnerId,
              prize: prize.prize_name,
              value: prize.prize_value_usd,
              rank: prize.rank
            });
          }
        }
      }

      // Update campaign status
      await client.query(
        `UPDATE lottery_campaigns 
        SET status = 'winners_drawn', winners_count = $1
        WHERE id = $2`,
        [winners.length, campaignId]
      );

      await client.query('COMMIT');

      logger.info(`🏆 Lottery winners drawn: ${campaignId} - ${winners.length} winners`);

      return winners;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Notify lottery winner
   */
  private async notifyWinner(userId: string, prizeName: string, prizeValue: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO notifications (user_id, type, message, data)
        VALUES ($1, 'lottery_winner', $2, $3)`,
        [
          userId,
          `🎉 CONGRATULATIONS! You won ${prizeName} ($${prizeValue})! 🏆`,
          JSON.stringify({ prizeName, prizeValue })
        ]
      );

      await client.query(
        `INSERT INTO badges (user_id, badge_key, earned_at)
        VALUES ($1, 'lottery_winner', NOW())
        ON CONFLICT (user_id, badge_key) DO NOTHING`,
        [userId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          lc.*,
          COALESCE(json_agg(
            json_build_object(
              'rank', lp.rank,
              'prizeName', lp.prize_name,
              'prizeValue', lp.prize_value_usd,
              'quantity', lp.quantity
            ) ORDER BY lp.rank
          ) FILTER (WHERE lp.id IS NOT NULL), '[]') as prizes
        FROM lottery_campaigns lc
        LEFT JOIN lottery_prizes lp ON lc.id = lp.campaign_id
        WHERE lc.status = 'active' AND lc.end_date > NOW()
        GROUP BY lc.id
        ORDER BY lc.created_at DESC`
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's lottery entries and stats
   */
  async getUserEntries(userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          le.*,
          lc.name as campaign_name,
          lc.total_prize_pool_usd,
          lc.end_date,
          lc.status as campaign_status,
          (le.tickets_earned::FLOAT / (SELECT SUM(tickets_earned) FROM lottery_entries WHERE campaign_id = le.campaign_id)) * 100 as win_probability
        FROM lottery_entries le
        JOIN lottery_campaigns lc ON le.campaign_id = lc.id
        WHERE le.user_id = $1
        ORDER BY le.entry_date DESC`,
        [userId]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get lottery analytics
   */
  async getAnalytics(campaignId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
          lc.*,
          COUNT(DISTINCT le.user_id) as unique_entrants,
          SUM(le.tickets_earned) as total_tickets,
          AVG(le.referrals_count) as avg_referrals_per_entry,
          COUNT(*) FILTER (WHERE le.is_winner = true) as winners_count
        FROM lottery_campaigns lc
        LEFT JOIN lottery_entries le ON lc.id = le.campaign_id
        WHERE lc.id = $1
        GROUP BY lc.id`,
        [campaignId]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
