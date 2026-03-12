/**
 * GEO API Routes
 */

import { Router } from 'express';
import { runAnalysis, getAnalysisResults, getHistory, getTrends } from '../controllers/geo.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Main GEO scan endpoint
router.post('/scan', authenticate, runAnalysis);

// Get analysis results (for polling)
router.get('/results/:promptId', authenticate, getAnalysisResults);

// History and trends
router.get('/history', authenticate, getHistory);
router.get('/trends', authenticate, getTrends);

export default router;