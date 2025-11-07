import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  agentOrchestrator,
  TaskCategory,
  TaskComplexity,
  ProviderStrategy,
  moderateContent,
  detectSpam,
  analyzeSentiment,
} from '../services/agentOrchestrator';
import logger from '../logger';

export const orchestratorRouter = Router();

/**
 * GET /api/orchestrator/health
 * Check health of all AI providers
 */
orchestratorRouter.get('/health', async (req, res: Response) => {
  try {
    const health = await agentOrchestrator.healthCheck();

    res.json({
      status: 'ok',
      providers: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      message: 'Health check failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/execute
 * Execute a task with automatic provider selection
 */
orchestratorRouter.post('/execute', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const {
    prompt,
    category,
    complexity,
    strategy,
    context,
    maxTokens,
    temperature,
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    const result = await agentOrchestrator.executeTask({
      prompt,
      category,
      complexity,
      strategy,
      userId: req.userId,
      context,
      maxTokens,
      temperature,
    });

    logger.info('Orchestrator task executed', {
      userId: req.userId,
      provider: result.provider,
      model: result.model,
      duration: result.duration,
      cached: result.cached,
    });

    res.json({
      response: result.response,
      metadata: {
        provider: result.provider,
        model: result.model,
        duration: result.duration,
        cached: result.cached,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (error: any) {
    logger.error('Orchestrator execution failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to execute task',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/batch
 * Execute multiple tasks in batch
 */
orchestratorRouter.post('/batch', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { tasks } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ message: 'Tasks array is required' });
  }

  if (tasks.length > 10) {
    return res.status(400).json({ message: 'Maximum 10 tasks per batch' });
  }

  try {
    const tasksWithUser = tasks.map((task) => ({
      ...task,
      userId: req.userId,
    }));

    const results = await agentOrchestrator.executeBatch(tasksWithUser);

    logger.info('Batch execution completed', {
      userId: req.userId,
      taskCount: results.length,
    });

    res.json({
      results: results.map((r) => ({
        response: r.response,
        metadata: {
          provider: r.provider,
          model: r.model,
          duration: r.duration,
          cached: r.cached,
        },
      })),
    });
  } catch (error: any) {
    logger.error('Batch execution failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to execute batch',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/moderate
 * Content moderation
 */
orchestratorRouter.post('/moderate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const result = await moderateContent(content);

    logger.info('Content moderation completed', {
      userId: req.userId,
      isSafe: result.isSafe,
    });

    res.json({
      isSafe: result.isSafe,
      reason: result.reason,
    });
  } catch (error: any) {
    logger.error('Content moderation failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to moderate content',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/detect-spam
 * Spam detection
 */
orchestratorRouter.post('/detect-spam', requireAuth, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const isSpam = await detectSpam(message);

    logger.info('Spam detection completed', {
      userId: req.userId,
      isSpam,
    });

    res.json({ isSpam });
  } catch (error: any) {
    logger.error('Spam detection failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to detect spam',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/sentiment
 * Sentiment analysis
 */
orchestratorRouter.post('/sentiment', requireAuth, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const sentiment = await analyzeSentiment(text);

    logger.info('Sentiment analysis completed', {
      userId: req.userId,
      sentiment,
    });

    res.json({ sentiment });
  } catch (error: any) {
    logger.error('Sentiment analysis failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to analyze sentiment',
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/clear-cache
 * Clear response cache
 */
orchestratorRouter.post('/clear-cache', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    agentOrchestrator.clearCache();

    logger.info('Cache cleared', { userId: req.userId });

    res.json({ message: 'Cache cleared successfully' });
  } catch (error: any) {
    logger.error('Cache clear failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to clear cache',
      error: error.message,
    });
  }
});

/**
 * GET /api/orchestrator/categories
 * List available task categories
 */
orchestratorRouter.get('/categories', (req, res: Response) => {
  res.json({
    categories: Object.values(TaskCategory),
    complexities: Object.values(TaskComplexity),
    strategies: Object.values(ProviderStrategy),
  });
});

export default orchestratorRouter;
