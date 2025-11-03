import { Router } from 'express';
import { Pool } from 'pg';
import { ProfitTracker } from '../../../../automation/profit-tracker';

const router = Router();

router.get('/stats', async (req, res) => {
    try {
        const pool: Pool = req.app.locals.pool;
        const profitTracker = new ProfitTracker(pool);

        const stats = await profitTracker.getDashboardStats();

        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

router.get('/health', async (req, res) => {
    try {
        const pool: Pool = req.app.locals.pool;

        await pool.query('SELECT 1');

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

export default router;
