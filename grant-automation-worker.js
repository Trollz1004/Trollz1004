#!/usr/bin/env node

/**
 * Grant Automation Worker - 24/7 Background Service
 *
 * Runs continuously to:
 * - Discover new grant opportunities every 6 hours
 * - Generate proposals for high-match grants
 * - Submit DAO proposals for community voting
 * - Track submission deadlines
 * - Update grant database
 */

const schedule = require('node-schedule');

console.log('🏛️ Grant Automation Worker Started');
console.log('📅 Running on schedule:');
console.log('  - Grant discovery: Every 6 hours');
console.log('  - Deadline checks: Every day at 9 AM');
console.log('  - Proposal generation: On-demand (high-match grants)');
console.log('');

// Mock implementation - in production, import actual services
async function discoverGrants() {
  console.log('🔍 [' + new Date().toISOString() + '] Discovering grant opportunities...');

  // Simulate grant discovery
  const grants = [
    { id: 'nsf-001', program: 'NSF AI Research', match: 92.5, deadline: '2025-12-31' },
    { id: 'sbir-002', program: 'SBIR AI/ML', match: 87.3, deadline: '2025-09-15' }
  ];

  console.log(`✅ Discovered ${grants.length} opportunities`);
  grants.forEach(g => {
    if (g.match >= 70) {
      console.log(`  ⭐ ${g.program}: ${g.match}% match (deadline: ${g.deadline})`);
    }
  });

  return grants;
}

async function checkDeadlines() {
  console.log('📅 [' + new Date().toISOString() + '] Checking grant deadlines...');

  // Check for approaching deadlines (30 days)
  const approaching = [
    { program: 'NSF AI Research', daysLeft: 55 }
  ];

  approaching.forEach(g => {
    if (g.daysLeft <= 30) {
      console.log(`⚠️  URGENT: ${g.program} deadline in ${g.daysLeft} days!`);
    } else {
      console.log(`  ℹ️  ${g.program}: ${g.daysLeft} days remaining`);
    }
  });
}

// Schedule grant discovery every 6 hours
schedule.scheduleJob('0 */6 * * *', async () => {
  console.log('\n🔄 Scheduled grant discovery triggered');
  try {
    await discoverGrants();
  } catch (error) {
    console.error('❌ Grant discovery error:', error);
  }
});

// Schedule deadline checks daily at 9 AM
schedule.scheduleJob('0 9 * * *', async () => {
  console.log('\n🔄 Scheduled deadline check triggered');
  try {
    await checkDeadlines();
  } catch (error) {
    console.error('❌ Deadline check error:', error);
  }
});

// Run initial discovery on startup
(async () => {
  console.log('🚀 Running initial grant discovery...\n');
  try {
    await discoverGrants();
    console.log('');
    await checkDeadlines();
    console.log('');
    console.log('✅ Grant automation worker initialized successfully');
    const nextRun = schedule.scheduledJobs['0 */6 * * *'];
    if (nextRun) {
      console.log('⏰ Next discovery: ' + nextRun.nextInvocation());
    }
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
})();

// Keep process alive
process.on('SIGTERM', () => {
  console.log('📴 Grant automation worker shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Grant automation worker shutting down...');
  process.exit(0);
});

console.log('💚 Grant automation worker running...');
console.log('📊 Target: $500K-2M annual funding');
console.log('');
