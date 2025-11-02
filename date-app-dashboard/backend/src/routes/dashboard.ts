import { Router, Request, Response } from 'express';
import { getRecentUsers, getUserGrowth } from '../daos/users';

const router = Router();

router.get('/recent-users', async (req: Request, res: Response) => {
    try {
        const users = await getRecentUsers();
        res.json(users);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: 'Failed to fetch recent users', message: err.message });
    }
});

router.get('/user-growth', async (req: Request, res: Response) => {
    try {
        const growthData = await getUserGrowth();
        res.json(growthData);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: 'Failed to fetch user growth data', message: err.message });
    }
});

export const dashboardRouter = router;