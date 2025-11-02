import { Router, Request, Response } from 'express';
import { getShopItems, getRevenueBreakdown } from '../daos/shop';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await getShopItems();
    res.json(items);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch shop items', message: err.message });
  }
});

router.get('/revenue-breakdown', async (req: Request, res: Response) => {
    try {
        const revenueBreakdown = await getRevenueBreakdown();
        res.json(revenueBreakdown);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: 'Failed to fetch revenue breakdown', message: err.message });
    }
});

export const shopRouter = router;