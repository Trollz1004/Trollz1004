import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  res.json({ message: 'Fundraiser route' });
});

export const fundraiserRouter = router;