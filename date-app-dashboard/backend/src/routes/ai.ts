import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createAnthropicClient, generateTextForUser } from '../services/anthropicApiClient';
import logger from '../logger';

export const aiRouter = Router();

/**
 * POST /api/ai/test
 * Simple test endpoint to verify Anthropic API integration
 */
aiRouter.post('/test', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    const response = await generateTextForUser(req.userId, prompt, {
      maxTokens: 200,
      temperature: 0.7,
    });

    logger.info('AI test request completed', { userId: req.userId });

    res.json({
      prompt: prompt,
      response: response,
      model: 'claude-3-5-sonnet-20241022',
    });
  } catch (error: any) {
    logger.error('AI test request failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to generate AI response',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/generate-bio
 * Generate a dating profile bio using AI
 */
aiRouter.post('/generate-bio', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { interests, about } = req.body;

  if (!interests) {
    return res.status(400).json({ message: 'Interests are required' });
  }

  try {
    const prompt = `Create an engaging, authentic dating profile bio for someone with the following information:

Interests: ${interests}
${about ? `About them: ${about}` : ''}

Guidelines:
- Keep it concise (2-3 sentences)
- Make it fun and approachable
- Highlight their interests naturally
- End with a conversation starter or call to action

Bio:`;

    const bio = await generateTextForUser(req.userId, prompt, {
      maxTokens: 150,
      temperature: 0.8,
    });

    logger.info('Generated dating bio', { userId: req.userId });

    res.json({
      bio: bio.trim(),
      interests: interests,
    });
  } catch (error: any) {
    logger.error('Bio generation failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to generate bio',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/icebreaker
 * Generate an icebreaker message for a match
 */
aiRouter.post('/icebreaker', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { matchName, matchInterests, commonInterests } = req.body;

  if (!matchName) {
    return res.status(400).json({ message: 'Match name is required' });
  }

  try {
    const client = createAnthropicClient(req.userId);

    const prompt = `Generate a friendly, personalized icebreaker message for starting a conversation on a dating app:

Match's name: ${matchName}
${matchInterests ? `Their interests: ${matchInterests}` : ''}
${commonInterests ? `Common interests: ${commonInterests}` : ''}

Guidelines:
- Be friendly and genuine
- Reference their interests if possible
- Keep it casual and conversational
- One or two sentences maximum
- Don't use emojis
- Don't be too forward

Icebreaker:`;

    const messages = [
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const result = await client.chat(messages, {
      maxTokens: 100,
      temperature: 0.9,
    });

    logger.info('Generated icebreaker message', { userId: req.userId });

    res.json({
      message: result.response.trim(),
      matchName: matchName,
    });
  } catch (error: any) {
    logger.error('Icebreaker generation failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to generate icebreaker',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/chat
 * Have a conversation with Claude
 */
aiRouter.post('/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Messages array is required' });
  }

  try {
    const client = createAnthropicClient(req.userId);

    // Add context if provided
    const conversationMessages = context
      ? [
          {
            role: 'user' as const,
            content: `Context: ${context}\n\n${messages[0].content}`,
          },
          ...messages.slice(1),
        ]
      : messages;

    const result = await client.chat(conversationMessages, {
      maxTokens: 500,
      temperature: 0.7,
    });

    logger.info('Chat conversation completed', {
      userId: req.userId,
      messageCount: messages.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    res.json({
      response: result.response,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
      },
    });
  } catch (error: any) {
    logger.error('Chat conversation failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to complete conversation',
      error: error.message,
    });
  }
});

export default aiRouter;
