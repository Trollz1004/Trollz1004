/**
 * Database Migration Verification Script
 * 
 * This script checks if all required tables and indexes exist for the Phase 1 referral system.
 * Run this after database initialization to verify schema setup.
 * 
 * Usage:
 *   npx ts-node src/scripts/verifySchema.ts
 */

import pool from '../database';
import logger from '../logger';

interface TableCheck {
  tableName: string;
  exists: boolean;
}

interface IndexCheck {
  indexName: string;
  tableName: string;
  exists: boolean;
}

/**
 * Check if required tables exist
 */
const checkTables = async (): Promise<TableCheck[]> => {
  const requiredTables = [
    'referral_codes',
    'referrals',
    'user_rewards',
    'automation_logs',
  ];

  const results: TableCheck[] = [];

  for (const tableName of requiredTables) {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );

    results.push({
      tableName,
      exists: result.rows[0].exists,
    });
  }

  return results;
};

/**
 * Check if required indexes exist
 */
const checkIndexes = async (): Promise<IndexCheck[]> => {
  const requiredIndexes = [
    { indexName: 'idx_referral_codes_code', tableName: 'referral_codes' },
    { indexName: 'idx_referral_codes_user_id', tableName: 'referral_codes' },
    { indexName: 'idx_referrals_referrer_user_id', tableName: 'referrals' },
    { indexName: 'idx_referrals_referred_user_id', tableName: 'referrals' },
    { indexName: 'idx_referrals_status', tableName: 'referrals' },
    { indexName: 'idx_user_rewards_user_id', tableName: 'user_rewards' },
    { indexName: 'idx_user_rewards_is_claimed', tableName: 'user_rewards' },
    { indexName: 'idx_automation_logs_service', tableName: 'automation_logs' },
    { indexName: 'idx_automation_logs_created_at', tableName: 'automation_logs' },
  ];

  const results: IndexCheck[] = [];

  for (const { indexName, tableName } of requiredIndexes) {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = $1
      )`,
      [indexName]
    );

    results.push({
      indexName,
      tableName,
      exists: result.rows[0].exists,
    });
  }

  return results;
};

/**
 * Check if pgcrypto extension is enabled
 */
const checkExtensions = async (): Promise<boolean> => {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT FROM pg_extension 
      WHERE extname = 'pgcrypto'
    )`
  );

  return result.rows[0].exists;
};

/**
 * Run all verification checks
 */
const verifySchema = async (): Promise<void> => {
  try {
    logger.info('🔍 Starting schema verification...');

    // Check extensions
    logger.info('\n📦 Checking extensions...');
    const pgcryptoExists = await checkExtensions();
    if (pgcryptoExists) {
      logger.info('✅ pgcrypto extension is enabled');
    } else {
      logger.error('❌ pgcrypto extension is missing');
      logger.error('   Run: CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    }

    // Check tables
    logger.info('\n📊 Checking tables...');
    const tableResults = await checkTables();
    let allTablesExist = true;

    for (const { tableName, exists } of tableResults) {
      if (exists) {
        logger.info(`✅ Table '${tableName}' exists`);
      } else {
        logger.error(`❌ Table '${tableName}' is missing`);
        allTablesExist = false;
      }
    }

    // Check indexes
    logger.info('\n🔗 Checking indexes...');
    const indexResults = await checkIndexes();
    let allIndexesExist = true;

    for (const { indexName, tableName, exists } of indexResults) {
      if (exists) {
        logger.info(`✅ Index '${indexName}' exists on '${tableName}'`);
      } else {
        logger.error(`❌ Index '${indexName}' is missing on '${tableName}'`);
        allIndexesExist = false;
      }
    }

    // Final summary
    logger.info('\n📋 Verification Summary:');
    logger.info(`   Extensions: ${pgcryptoExists ? '✅' : '❌'}`);
    logger.info(`   Tables: ${allTablesExist ? '✅' : '❌'}`);
    logger.info(`   Indexes: ${allIndexesExist ? '✅' : '❌'}`);

    if (pgcryptoExists && allTablesExist && allIndexesExist) {
      logger.info('\n🎉 Schema verification passed! Database is ready.');
      process.exit(0);
    } else {
      logger.error('\n❌ Schema verification failed. Please run database migrations.');
      logger.error('   Run: npm run migrate (or ensure initializeDatabase() is called on server start)');
      process.exit(1);
    }
  } catch (error: any) {
    logger.error('Schema verification failed:', { error: error.message });
    process.exit(1);
  }
};

// Run verification if executed directly
if (require.main === module) {
  verifySchema();
}

export { verifySchema };
