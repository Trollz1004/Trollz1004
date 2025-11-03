import pool from '../../database';
import logger from '../../logger';

export interface ReferralContest {
  id?: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  prize_tier_1?: string;
  prize_tier_2?: string;
  prize_tier_3?: string;
  min_referrals_tier_1?: number;
  min_referrals_tier_2?: number;
  min_referrals_tier_3?: number;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ContestParticipant {
  id?: string;
  user_id: string;
  contest_id: string;
  referrals_count?: number;
  prize_won?: string;
  awarded_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Create a new referral contest
 */
export async function createContest(
  name: string,
  description: string,
  startDate: Date,
  endDate: Date,
  prizes: {
    tier1: string;
    tier2: string;
    tier3: string;
    minReferrals1: number;
    minReferrals2: number;
    minReferrals3: number;
  }
): Promise<{ success: boolean; contest?: ReferralContest; error?: string }> {
  try {
    // Validate dates
    if (startDate >= endDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    const result = await pool.query(
      `INSERT INTO referral_contests (
        name, description, start_date, end_date,
        prize_tier_1, prize_tier_2, prize_tier_3,
        min_referrals_tier_1, min_referrals_tier_2, min_referrals_tier_3,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'upcoming')
      RETURNING *`,
      [
        name,
        description,
        startDate,
        endDate,
        prizes.tier1,
        prizes.tier2,
        prizes.tier3,
        prizes.minReferrals1,
        prizes.minReferrals2,
        prizes.minReferrals3,
      ]
    );

    const contest = result.rows[0];
    logger.info('Referral contest created', { contestId: contest.id, name });

    return { success: true, contest };
  } catch (error: any) {
    logger.error('Failed to create contest', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all contests
 */
export async function getAllContests(
  status?: string
): Promise<{ success: boolean; contests?: ReferralContest[]; error?: string }> {
  try {
    let query = 'SELECT * FROM referral_contests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY start_date DESC';

    const result = await pool.query(query, params);

    return { success: true, contests: result.rows };
  } catch (error: any) {
    logger.error('Failed to get contests', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get active contests (currently running)
 */
export async function getActiveContests(): Promise<{
  success: boolean;
  contests?: ReferralContest[];
  error?: string;
}> {
  try {
    const result = await pool.query(
      `SELECT * FROM referral_contests
       WHERE status = 'active'
         AND start_date <= NOW()
         AND end_date >= NOW()
       ORDER BY end_date ASC`
    );

    return { success: true, contests: result.rows };
  } catch (error: any) {
    logger.error('Failed to get active contests', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Start a contest (set status to 'active')
 */
export async function startContest(
  contestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE referral_contests
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND status = 'upcoming' AND start_date <= NOW()
       RETURNING *`,
      [contestId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Contest not found or cannot be started' };
    }

    logger.info('Contest started', { contestId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to start contest', { contestId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Track referral for contest (increment participant's count)
 */
export async function trackContestReferral(
  userId: string,
  contestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if contest is active
    const contestCheck = await pool.query(
      `SELECT * FROM referral_contests
       WHERE id = $1 AND status = 'active'`,
      [contestId]
    );

    if (contestCheck.rows.length === 0) {
      return { success: false, error: 'Contest not active' };
    }

    // Upsert participant (insert or increment)
    await pool.query(
      `INSERT INTO contest_participants (user_id, contest_id, referrals_count, updated_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (user_id, contest_id)
       DO UPDATE SET referrals_count = contest_participants.referrals_count + 1, updated_at = NOW()`,
      [userId, contestId]
    );

    logger.info('Contest referral tracked', { userId, contestId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to track contest referral', { userId, contestId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get contest leaderboard
 */
export async function getContestLeaderboard(
  contestId: string,
  limit: number = 10
): Promise<{
  success: boolean;
  leaderboard?: Array<{
    user_id: string;
    name: string;
    referrals_count: number;
    prize_eligible?: string;
  }>;
  error?: string;
}> {
  try {
    // Get contest details
    const contestResult = await pool.query(
      `SELECT * FROM referral_contests WHERE id = $1`,
      [contestId]
    );

    if (contestResult.rows.length === 0) {
      return { success: false, error: 'Contest not found' };
    }

    const contest = contestResult.rows[0];

    // Get top participants with user details
    const result = await pool.query(
      `SELECT cp.user_id, cp.referrals_count, p.first_name, p.last_name
       FROM contest_participants cp
       JOIN profiles p ON cp.user_id = p.user_id
       WHERE cp.contest_id = $1
       ORDER BY cp.referrals_count DESC, cp.updated_at ASC
       LIMIT $2`,
      [contestId, limit]
    );

    const leaderboard = result.rows.map((row, index) => {
      let prizeEligible: string | undefined;

      // Determine prize eligibility
      if (index === 0 && row.referrals_count >= contest.min_referrals_tier_1) {
        prizeEligible = contest.prize_tier_1;
      } else if (index === 1 && row.referrals_count >= contest.min_referrals_tier_2) {
        prizeEligible = contest.prize_tier_2;
      } else if (index === 2 && row.referrals_count >= contest.min_referrals_tier_3) {
        prizeEligible = contest.prize_tier_3;
      }

      return {
        user_id: row.user_id,
        name: `${row.first_name} ${row.last_name}`,
        referrals_count: row.referrals_count,
        prize_eligible: prizeEligible,
      };
    });

    return { success: true, leaderboard };
  } catch (error: any) {
    logger.error('Failed to get contest leaderboard', { contestId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * End contest and award prizes
 */
export async function endContestAndAwardPrizes(
  contestId: string
): Promise<{ success: boolean; winners?: any[]; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update contest status
    const contestResult = await client.query(
      `UPDATE referral_contests
       SET status = 'ended', updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [contestId]
    );

    if (contestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Contest not found or not active' };
    }

    const contest = contestResult.rows[0];

    // Get top 3 participants
    const winnersResult = await client.query(
      `SELECT cp.*, p.first_name, p.last_name
       FROM contest_participants cp
       JOIN profiles p ON cp.user_id = p.user_id
       WHERE cp.contest_id = $1
       ORDER BY cp.referrals_count DESC, cp.updated_at ASC
       LIMIT 3`,
      [contestId]
    );

    const winners = [];

    for (let i = 0; i < winnersResult.rows.length; i++) {
      const participant = winnersResult.rows[i];
      let prize: string | null = null;

      // Award prizes based on position and minimum referrals
      if (i === 0 && participant.referrals_count >= contest.min_referrals_tier_1) {
        prize = contest.prize_tier_1;
      } else if (i === 1 && participant.referrals_count >= contest.min_referrals_tier_2) {
        prize = contest.prize_tier_2;
      } else if (i === 2 && participant.referrals_count >= contest.min_referrals_tier_3) {
        prize = contest.prize_tier_3;
      }

      if (prize) {
        // Update participant with prize
        await client.query(
          `UPDATE contest_participants
           SET prize_won = $1, awarded_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [prize, participant.id]
        );

        winners.push({
          user_id: participant.user_id,
          name: `${participant.first_name} ${participant.last_name}`,
          referrals_count: participant.referrals_count,
          prize_won: prize,
          position: i + 1,
        });
      }
    }

    await client.query('COMMIT');

    logger.info('Contest ended and prizes awarded', { contestId, winnersCount: winners.length });

    return { success: true, winners };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to end contest and award prizes', { contestId, error: error.message });
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Get user's contest participation
 */
export async function getUserContestStats(
  userId: string,
  contestId: string
): Promise<{
  success: boolean;
  stats?: {
    referrals_count: number;
    rank: number;
    prize_eligible?: string;
  };
  error?: string;
}> {
  try {
    // Get user's participation
    const participantResult = await pool.query(
      `SELECT * FROM contest_participants
       WHERE user_id = $1 AND contest_id = $2`,
      [userId, contestId]
    );

    if (participantResult.rows.length === 0) {
      return {
        success: true,
        stats: {
          referrals_count: 0,
          rank: 0,
        },
      };
    }

    const participant = participantResult.rows[0];

    // Get user's rank
    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM contest_participants
       WHERE contest_id = $1
         AND (referrals_count > $2
              OR (referrals_count = $2 AND updated_at < $3))`,
      [contestId, participant.referrals_count, participant.updated_at]
    );

    const rank = parseInt(rankResult.rows[0].rank);

    // Get contest details for prize eligibility
    const contestResult = await pool.query(
      `SELECT * FROM referral_contests WHERE id = $1`,
      [contestId]
    );

    const contest = contestResult.rows[0];
    let prizeEligible: string | undefined;

    if (rank === 1 && participant.referrals_count >= contest.min_referrals_tier_1) {
      prizeEligible = contest.prize_tier_1;
    } else if (rank === 2 && participant.referrals_count >= contest.min_referrals_tier_2) {
      prizeEligible = contest.prize_tier_2;
    } else if (rank === 3 && participant.referrals_count >= contest.min_referrals_tier_3) {
      prizeEligible = contest.prize_tier_3;
    }

    return {
      success: true,
      stats: {
        referrals_count: participant.referrals_count,
        rank,
        prize_eligible: prizeEligible,
      },
    };
  } catch (error: any) {
    logger.error('Failed to get user contest stats', { userId, contestId, error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  createContest,
  getAllContests,
  getActiveContests,
  startContest,
  trackContestReferral,
  getContestLeaderboard,
  endContestAndAwardPrizes,
  getUserContestStats,
};
