import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  res.json({ message: 'Marketing route' });
});

export const marketingRouter = router;