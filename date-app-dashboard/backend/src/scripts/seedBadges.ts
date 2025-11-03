/**
 * Seed Badge Definitions
 * Populates the badges table with the 8 core achievement badges
 */

import pool from '../database';
import logger from '../logger';

interface BadgeDefinition {
  name: string;
  display_name: string;
  description: string;
  icon_url: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  milestone_count: number;
  reward_type: 'premium_days' | 'extra_swipes' | 'status' | 'feature_unlock';
  reward_value: string;
  badge_category: 'matches' | 'referrals' | 'profile' | 'activity' | 'engagement';
}

const badgeDefinitions: BadgeDefinition[] = [
  // ============================================
  // MATCH-BASED BADGES
  // ============================================
  {
    name: 'first_match',
    display_name: 'First Match',
    description: 'Congratulations on your first match! The journey begins.',
    icon_url: '/badges/first-match.svg',
    rarity: 'common',
    milestone_count: 1,
    reward_type: 'premium_days',
    reward_value: '7', // 1 week free premium
    badge_category: 'matches',
  },
  {
    name: 'match_master',
    display_name: 'Match Master',
    description: '25 matches! You\'re getting good at this.',
    icon_url: '/badges/match-master.svg',
    rarity: 'rare',
    milestone_count: 25,
    reward_type: 'premium_days',
    reward_value: '14', // 2 weeks free premium
    badge_category: 'matches',
  },
  {
    name: 'match_king',
    display_name: 'Matchmaker King',
    description: '50 matches! You\'re a true matchmaking royalty.',
    icon_url: '/badges/match-king.svg',
    rarity: 'epic',
    milestone_count: 50,
    reward_type: 'premium_days',
    reward_value: '30', // 1 month free premium
    badge_category: 'matches',
  },

  // ============================================
  // REFERRAL-BASED BADGES
  // ============================================
  {
    name: 'referral_expert',
    display_name: 'Referral Expert',
    description: '5 successful referrals! You\'re helping grow the community.',
    icon_url: '/badges/referral-expert.svg',
    rarity: 'uncommon',
    milestone_count: 5,
    reward_type: 'extra_swipes',
    reward_value: '100', // 100 extra swipes
    badge_category: 'referrals',
  },
  {
    name: 'referral_overlord',
    display_name: 'Referral Overlord',
    description: '20 successful referrals! You\'re a community champion.',
    icon_url: '/badges/referral-overlord.svg',
    rarity: 'legendary',
    milestone_count: 20,
    reward_type: 'premium_days',
    reward_value: '60', // 2 months free premium
    badge_category: 'referrals',
  },

  // ============================================
  // PROFILE-BASED BADGES
  // ============================================
  {
    name: 'profile_perfectionist',
    display_name: 'Profile Perfectionist',
    description: 'Perfect profile! All fields complete with 5+ photos.',
    icon_url: '/badges/profile-perfectionist.svg',
    rarity: 'rare',
    milestone_count: 5, // 5 criteria: name, bio, location, interests, photos
    reward_type: 'status',
    reward_value: 'verified', // Special "Verified" status
    badge_category: 'profile',
  },

  // ============================================
  // ACTIVITY-BASED BADGES
  // ============================================
  {
    name: 'streak_king',
    display_name: 'Streak King',
    description: '7 consecutive days active! Building habits pays off.',
    icon_url: '/badges/streak-king.svg',
    rarity: 'epic',
    milestone_count: 7,
    reward_type: 'feature_unlock',
    reward_value: 'streak_freeze', // Unlock streak freeze feature
    badge_category: 'activity',
  },

  // ============================================
  // ENGAGEMENT-BASED BADGES
  // ============================================
  {
    name: 'super_liker',
    display_name: 'Super Liker',
    description: '100+ likes sent! You\'re actively engaging with the community.',
    icon_url: '/badges/super-liker.svg',
    rarity: 'uncommon',
    milestone_count: 100,
    reward_type: 'extra_swipes',
    reward_value: '50', // 50 extra swipes
    badge_category: 'engagement',
  },
];

/**
 * Seed badge definitions into database
 */
const seedBadges = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    logger.info('Starting badge definitions seeding...');

    await client.query('BEGIN');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const badge of badgeDefinitions) {
      const checkQuery = `SELECT id FROM badges WHERE name = $1`;
      const existing = await client.query(checkQuery, [badge.name]);

      if (existing.rows.length > 0) {
        // Update existing badge
        const updateQuery = `
          UPDATE badges
          SET 
            display_name = $1,
            description = $2,
            icon_url = $3,
            rarity = $4,
            milestone_count = $5,
            reward_type = $6,
            reward_value = $7,
            badge_category = $8,
            updated_at = NOW()
          WHERE name = $9
        `;

        await client.query(updateQuery, [
          badge.display_name,
          badge.description,
          badge.icon_url,
          badge.rarity,
          badge.milestone_count,
          badge.reward_type,
          badge.reward_value,
          badge.badge_category,
          badge.name,
        ]);

        updatedCount++;
      } else {
        // Insert new badge
        const insertQuery = `
          INSERT INTO badges (
            name,
            display_name,
            description,
            icon_url,
            rarity,
            milestone_count,
            reward_type,
            reward_value,
            badge_category,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        `;

        await client.query(insertQuery, [
          badge.name,
          badge.display_name,
          badge.description,
          badge.icon_url,
          badge.rarity,
          badge.milestone_count,
          badge.reward_type,
          badge.reward_value,
          badge.badge_category,
        ]);

        insertedCount++;
      }
    }

    await client.query('COMMIT');

    logger.info('✅ Badge seeding complete!', {
      inserted: insertedCount,
      updated: updatedCount,
      total: badgeDefinitions.length,
    });

    // Log summary by category
    const summary = await client.query(`
      SELECT 
        badge_category,
        rarity,
        COUNT(*) as count
      FROM badges
      WHERE is_active = true
      GROUP BY badge_category, rarity
      ORDER BY badge_category, rarity
    `);

    console.log('\n📊 Badge Summary:');
    console.log('=================');
    summary.rows.forEach((row: any) => {
      console.log(`${row.badge_category.toUpperCase()} - ${row.rarity}: ${row.count} badge(s)`);
    });

    const totalQuery = await client.query(`SELECT COUNT(*) as count FROM badges WHERE is_active = true`);
    console.log(`\nTotal Active Badges: ${totalQuery.rows[0].count}\n`);

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed badges', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Main execution
 */
const main = async (): Promise<void> => {
  try {
    await seedBadges();
    console.log('\n✨ Badge definitions seeded successfully!');
    console.log('💡 Users can now earn badges as they use the app.\n');
    process.exit(0);
  } catch (error: any) {
    logger.error('Badge seeding failed', { error: error.message });
    console.error('\n❌ Badge seeding failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

export { seedBadges, badgeDefinitions };
