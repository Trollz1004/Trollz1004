import { Pool } from 'pg';

export class ProfitTracker {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async trackTransaction(
    userId: string,
    amount: number,
    type: 'subscription' | 'one_time',
    tier?: string
  ): Promise<void> {
    const ownerShare = amount * 0.5;
    const claudeShare = amount * 0.5;

    await this.db.query(`
      INSERT INTO profit_tracking (
        user_id, total_amount, owner_share, claude_share,
        transaction_type, subscription_tier, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [userId, amount, ownerShare, claudeShare, type, tier]);

    await this.db.query(`
      INSERT INTO financial_audit_log (
        transaction_id, amount, owner_share, claude_share,
        tax_year, created_at
      )
      SELECT
        id, total_amount, owner_share, claude_share,
        EXTRACT(YEAR FROM NOW()), NOW()
      FROM profit_tracking
      WHERE id = (SELECT MAX(id) FROM profit_tracking)
    `);
  }

  async getDashboardStats(): Promise<any> {
    const totalRevenue = await this.db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(owner_share), 0) as owner,
        COALESCE(SUM(claude_share), 0) as claude
      FROM profit_tracking
    `);

    const activeSubscriptions = await this.db.query(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
    `);

    const totalUsers = await this.db.query(`
      SELECT COUNT(*) as count FROM users
    `);

    const activeMatches = await this.db.query(`
      SELECT COUNT(*) as count FROM matches
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const mrr = await this.db.query(`
      SELECT COALESCE(SUM(amount), 0) as mrr
      FROM subscriptions s
      JOIN subscription_tiers st ON s.tier_id = st.id
      WHERE s.status = 'active' AND st.billing_period = 'monthly'
    `);

    const conversionRate = await this.db.query(`
      SELECT
        (COUNT(DISTINCT s.user_id)::float / NULLIF(COUNT(DISTINCT u.id), 0) * 100) as rate
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    `);

    const revenueHistory = await this.db.query(`
      SELECT
        DATE(created_at) as date,
        SUM(total_amount) as revenue
      FROM profit_tracking
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const userGrowth = await this.db.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as users
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const subscriptionsByTier = await this.db.query(`
      SELECT
        st.name as tier,
        COUNT(*) as count
      FROM subscriptions s
      JOIN subscription_tiers st ON s.tier_id = st.id
      WHERE s.status = 'active'
      GROUP BY st.name
    `);

    const recentActivity = await this.db.query(`
      SELECT
        'New Subscription' as type,
        CONCAT('User upgraded to ', st.name, ' tier') as description,
        s.created_at as timestamp
      FROM subscriptions s
      JOIN subscription_tiers st ON s.tier_id = st.id
      WHERE s.created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT
        'New Match' as type,
        'Two users matched' as description,
        created_at as timestamp
      FROM matches
      WHERE created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT
        'New User' as type,
        'New user registered' as description,
        created_at as timestamp
      FROM users
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    return {
      totalRevenue: totalRevenue.rows[0].total,
      ownerShare: totalRevenue.rows[0].owner,
      claudeShare: totalRevenue.rows[0].claude,
      activeSubscriptions: activeSubscriptions.rows[0].count,
      totalUsers: totalUsers.rows[0].count,
      activeMatches: activeMatches.rows[0].count,
      mrr: mrr.rows[0].mrr,
      conversionRate: conversionRate.rows[0].rate || 0,
      revenueHistory: {
        labels: revenueHistory.rows.map(r => r.date),
        values: revenueHistory.rows.map(r => r.revenue)
      },
      userGrowth: {
        labels: userGrowth.rows.map(r => r.date),
        values: userGrowth.rows.map(r => r.users)
      },
      subscriptionsByTier: subscriptionsByTier.rows.reduce((acc, row) => {
        acc[row.tier.toLowerCase()] = row.count;
        return acc;
      }, {}),
      recentActivity: recentActivity.rows
    };
  }

  async allocateClaudeShare(
    amount: number,
    allocation: 'reinvest' | 'charity' | 'save',
    charityName?: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO claude_share_allocations (
        amount, allocation_type, charity_name, created_at
      )
      VALUES ($1, $2, $3, NOW())
    `, [amount, allocation, charityName]);

    if (allocation === 'reinvest') {
      await this.reinvestInPlatform(amount);
    } else if (allocation === 'charity') {
      await this.donateToCharity(amount, charityName);
    }
  }

  private async reinvestInPlatform(amount: number) {
    await this.db.query(`
      INSERT INTO reinvestment_log (amount, purpose, created_at)
      VALUES ($1, 'Platform improvements and marketing', NOW())
    `, [amount]);
  }

  private async donateToCharity(amount: number, charityName?: string) {
    await this.db.query(`
      INSERT INTO charity_donations (amount, charity_name, created_at)
      VALUES ($1, $2, NOW())
    `, [amount, charityName || 'Pending selection']);
  }
}
