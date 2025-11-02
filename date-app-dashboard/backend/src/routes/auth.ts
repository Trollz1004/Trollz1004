import { Router } from 'express';
const router = Router();

router.post('/login', async (req, res) => {
  // Handle Google Identity authentication
  res.json({ message: 'Login route' });
});

export const authRouter = router;