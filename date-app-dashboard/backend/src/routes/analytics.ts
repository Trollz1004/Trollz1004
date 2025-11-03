import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import {
  getExecutiveDashboard,
  getConversionFunnel,
  getRevenueMetrics,
  getUserEngagementMetrics,
  getActiveUsers,
  getGrowthRate,
} from '../automations/analytics/analyticsService';
import {
  getAcquisitionBySource,
  getChannelPerformance,
  getTopReferrers,
  getUTMPerformance,
} from '../automations/analytics/acquisitionService';
import {
  calculateRetentionRate,
  calculateChurnRate,
  getCohortRetentionAnalysis,
  calculateLTV,
  predictChurnRisk,
  getRetentionByTier,
} from '../automations/analytics/retentionService';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  exportToCSV,
  getHistoricalTrends,
  getMetricsBySegment,
} from '../automations/analytics/reportingService';
import logger from '../logger';

const router = Router();

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * GET /api/analytics/dashboard
 * Get executive dashboard summary
 */
router.get('/dashboard', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dashboard = await getExecutiveDashboard();
    res.json(dashboard);
  } catch (error: any) {
    logger.error('Failed to get dashboard', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve dashboard' });
  }
});

/**
 * GET /api/analytics/acquisition
 * User acquisition by source
 */
router.get('/acquisition', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const acquisition = await getAcquisitionBySource(start, end);
    res.json(acquisition);
  } catch (error: any) {
    logger.error('Failed to get acquisition data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve acquisition data' });
  }
});

/**
 * GET /api/analytics/funnel
 * Conversion funnel metrics
 */
router.get('/funnel', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const funnel = await getConversionFunnel();
    res.json(funnel);
  } catch (error: any) {
    logger.error('Failed to get funnel data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve funnel data' });
  }
});

/**
 * GET /api/analytics/revenue
 * Revenue metrics (daily, weekly, monthly)
 */
router.get('/revenue', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    if (!['daily', 'weekly', 'monthly'].includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, or monthly' });
    }

    const revenue = await getRevenueMetrics(period as 'daily' | 'weekly' | 'monthly');
    res.json(revenue);
  } catch (error: any) {
    logger.error('Failed to get revenue metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve revenue metrics' });
  }
});

/**
 * GET /api/analytics/retention
 * Retention curves by cohort
 */
router.get('/retention', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const retentionDays = parseInt(days as string);

    if (isNaN(retentionDays) || retentionDays <= 0) {
      return res.status(400).json({ error: 'Invalid days parameter' });
    }

    const retention = await calculateRetentionRate(retentionDays);
    res.json(retention);
  } catch (error: any) {
    logger.error('Failed to get retention data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve retention data' });
  }
});

/**
 * GET /api/analytics/churn
 * Churn metrics
 */
router.get('/churn', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const churnDays = parseInt(days as string);

    if (isNaN(churnDays) || churnDays <= 0) {
      return res.status(400).json({ error: 'Invalid days parameter' });
    }

    const churn = await calculateChurnRate(churnDays);
    const retentionByTier = await getRetentionByTier();
    const churnRisk = await predictChurnRisk();

    res.json({
      churnRates: churn,
      retentionByTier,
      usersAtRisk: churnRisk.slice(0, 20), // Top 20 at-risk users
    });
  } catch (error: any) {
    logger.error('Failed to get churn data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve churn data' });
  }
});

/**
 * GET /api/analytics/ltv
 * Lifetime value by cohort
 */
router.get('/ltv', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { cohort } = req.query;

    const ltv = await calculateLTV(cohort as string | undefined);
    res.json(ltv);
  } catch (error: any) {
    logger.error('Failed to get LTV data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve LTV data' });
  }
});

/**
 * GET /api/analytics/channels
 * Performance by acquisition channel
 */
router.get('/channels', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const channels = await getChannelPerformance();
    const topReferrers = await getTopReferrers(10);
    const utmPerformance = await getUTMPerformance();

    res.json({
      channels,
      topReferrers,
      utmCampaigns: utmPerformance,
    });
  } catch (error: any) {
    logger.error('Failed to get channel data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve channel data' });
  }
});

/**
 * GET /api/analytics/engagement
 * User engagement metrics
 */
router.get('/engagement', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    // Regular users can only see their own engagement
    const targetUserId = userId as string | undefined;
    
    // @ts-ignore - req.user is set by requireAuth middleware
    if (targetUserId && targetUserId !== req.user?.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // @ts-ignore
    const engagement = await getUserEngagementMetrics(targetUserId || req.user?.userId);
    res.json(engagement);
  } catch (error: any) {
    logger.error('Failed to get engagement metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve engagement metrics' });
  }
});

/**
 * GET /api/analytics/active-users
 * Daily/weekly/monthly active users (DAU, WAU, MAU)
 */
router.get('/active-users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const activeUsers = await getActiveUsers();
    res.json(activeUsers);
  } catch (error: any) {
    logger.error('Failed to get active users', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve active users' });
  }
});

/**
 * GET /api/analytics/growth-rate
 * User and revenue growth rates
 */
router.get('/growth-rate', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const growth = await getGrowthRate();
    res.json(growth);
  } catch (error: any) {
    logger.error('Failed to get growth rate', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve growth rate' });
  }
});

/**
 * GET /api/analytics/cohort-analysis
 * Full cohort retention table (classic cohort analysis)
 */
router.get('/cohort-analysis', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const cohorts = await getCohortRetentionAnalysis();
    res.json(cohorts);
  } catch (error: any) {
    logger.error('Failed to get cohort analysis', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve cohort analysis' });
  }
});

/**
 * GET /api/analytics/segment/:segment
 * Metrics by user segment (tier, gender, age, location)
 */
router.get('/segment/:segment', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { segment } = req.params;

    if (!['tier', 'gender', 'age', 'location'].includes(segment)) {
      return res.status(400).json({ error: 'Invalid segment. Use: tier, gender, age, or location' });
    }

    const metrics = await getMetricsBySegment(segment as 'tier' | 'gender' | 'age' | 'location');
    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to get segment metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve segment metrics' });
  }
});

/**
 * GET /api/analytics/trends
 * Historical trend data from daily snapshots
 */
router.get('/trends', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const trendDays = parseInt(days as string);

    if (isNaN(trendDays) || trendDays <= 0 || trendDays > 365) {
      return res.status(400).json({ error: 'Invalid days parameter (1-365)' });
    }

    const trends = await getHistoricalTrends(trendDays);
    res.json(trends);
  } catch (error: any) {
    logger.error('Failed to get trends', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve trends' });
  }
});

// =====================================================
// REPORTING ENDPOINTS
// =====================================================

/**
 * POST /api/analytics/report/daily
 * Generate daily report (email to admin)
 */
router.post('/report/daily', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { emailRecipient } = req.body;

    const report = await generateDailyReport(emailRecipient);
    res.json({
      success: true,
      report,
      emailSent: !!emailRecipient,
    });
  } catch (error: any) {
    logger.error('Failed to generate daily report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

/**
 * POST /api/analytics/report/weekly
 * Generate weekly business review
 */
router.post('/report/weekly', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await generateWeeklyReport();
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to generate weekly report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

/**
 * POST /api/analytics/report/monthly
 * Generate monthly performance review
 */
router.post('/report/monthly', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await generateMonthlyReport();
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to generate monthly report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

/**
 * GET /api/analytics/export
 * Export data to CSV
 */
router.get('/export', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { table, startDate, endDate } = req.query;

    if (!table) {
      return res.status(400).json({ error: 'Table parameter required' });
    }

    const validTables = ['revenue_events', 'user_acquisition', 'engagement_metrics', 'daily_snapshots'];
    if (!validTables.includes(table as string)) {
      return res.status(400).json({ 
        error: `Invalid table. Use: ${validTables.join(', ')}` 
      });
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const csv = await exportToCSV(
      table as 'revenue_events' | 'user_acquisition' | 'engagement_metrics' | 'daily_snapshots',
      start,
      end
    );

    if (!csv) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${table}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error: any) {
    logger.error('Failed to export CSV', { error: error.message });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
