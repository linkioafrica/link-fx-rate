import { Router } from 'express';
const router = Router();
import { buyRateController, sellRateController } from '../controllers/rate.js';

// GET /api/rate/buy?token=SYMBOL
router.get('/buy', buyRateController);

// GET /api/rate/sell?token=SYMBOL
router.get('/sell', sellRateController);

export default router;
