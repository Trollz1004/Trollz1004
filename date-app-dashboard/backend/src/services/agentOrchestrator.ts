import { createAnthropicClient } from './anthropicApiClient';
import { ollamaClient } from './ollamaClient';
import { getStoredTokens, isTokenExpired } from './anthropicOAuthService';
import logger from '../logger';
import config from '../config';

/**
 * Task complexity levels
 */
export enum TaskComplexity {
  SIMPLE = 'simple', // Use Ollama
  MODERATE = 'moderate', // Use Claude Haiku
  COMPLEX = 'complex', // Use Claude Sonnet
}

/**
 * Task categories for routing
 */
export enum TaskCategory {
  // Ollama-preferred (simple, high-volume)
  CONTENT_MODERATION = 'content_moderation',
  SPAM_DETECTION = 'spam_detection',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  KEYWORD_EXTRACTION = 'keyword_extraction',
  TEXT_CLASSIFICATION = 'text_classification',
  SIMPLE_QA = 'simple_qa',

  // Claude Haiku-preferred (fast, moderate complexity)
  PROFILE_BIO_GENERATION = 'profile_bio_generation',
  ICEBREAKER_GENERATION = 'icebreaker_generation',
  MESSAGE_SUGGESTIONS = 'message_suggestions',
  CONVERSATION_STARTERS = 'conversation_starters',
  QUICK_RESPONSES = 'quick_responses',

  // Claude Sonnet-preferred (complex reasoning)
  COMPATIBILITY_ANALYSIS = 'compatibility_analysis',
  RELATIONSHIP_ADVICE = 'relationship_advice',
  DETAILED_MATCHING = 'detailed_matching',
  CONTENT_CREATION = 'content_creation',
  COMPLEX_REASONING = 'complex_reasoning',
}

/**
 * Provider selection strategy
 */
export enum ProviderStrategy {
  AUTO = 'auto', // Automatically choose best provider
  OLLAMA_ONLY = 'ollama_only', // Use only Ollama
  ANTHROPIC_ONLY = 'anthropic_only', // Use only Anthropic
  COST_OPTIMIZED = 'cost_optimized', // Prefer cheaper options
  PERFORMANCE_OPTIMIZED = 'performance_optimized', // Prefer faster options
}

interface TaskRequest {
  prompt: string;
  category?: TaskCategory;
  complexity?: TaskComplexity;
  strategy?: ProviderStrategy;
  userId?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

interface TaskResponse {
  response: string;
  provider: 'ollama' | 'anthropic';
  model: string;
  duration: number;
  tokensUsed?: number;
  cached: boolean;
}

/**
 * Agent Orchestrator
 * Routes AI tasks to optimal provider (Ollama vs Anthropic)
 */
export class AgentOrchestrator {
  private responseCache: Map<string, { response: string; timestamp: number }>;
  private cacheTTL: number = 3600000; // 1 hour

  constructor() {
    this.responseCache = new Map();
  }

  /**
   * Determine complexity from category
   */
  private getCategoryComplexity(category: TaskCategory): TaskComplexity {
    const simpleCategories = [
      TaskCategory.CONTENT_MODERATION,
      TaskCategory.SPAM_DETECTION,
      TaskCategory.SENTIMENT_ANALYSIS,
      TaskCategory.KEYWORD_EXTRACTION,
      TaskCategory.TEXT_CLASSIFICATION,
      TaskCategory.SIMPLE_QA,
    ];

    const complexCategories = [
      TaskCategory.COMPATIBILITY_ANALYSIS,
      TaskCategory.RELATIONSHIP_ADVICE,
      TaskCategory.DETAILED_MATCHING,
      TaskCategory.CONTENT_CREATION,
      TaskCategory.COMPLEX_REASONING,
    ];

    if (simpleCategories.includes(category)) {
      return TaskComplexity.SIMPLE;
    } else if (complexCategories.includes(category)) {
      return TaskComplexity.COMPLEX;
    }
    return TaskComplexity.MODERATE;
  }

  /**
   * Check if user has valid Anthropic OAuth tokens
   */
  private async hasValidAnthropicAccess(userId?: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const tokens = await getStoredTokens(userId);
      if (!tokens) return false;
      return !isTokenExpired(tokens.expiresAt);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Ollama is available
   */
  private async isOllamaAvailable(): Promise<boolean> {
    if (!config.ollama.enabled) return false;
    return await ollamaClient.ping();
  }

  /**
   * Select provider based on strategy and availability
   */
  private async selectProvider(
    request: TaskRequest
  ): Promise<'ollama' | 'anthropic' | null> {
    const complexity = request.complexity || this.getCategoryComplexity(request.category!);
    const strategy = request.strategy || ProviderStrategy.AUTO;

    const [hasAnthropicAccess, ollamaAvailable] = await Promise.all([
      this.hasValidAnthropicAccess(request.userId),
      this.isOllamaAvailable(),
    ]);

    logger.info('Provider selection', {
      complexity,
      strategy,
      hasAnthropicAccess,
      ollamaAvailable,
      category: request.category,
    });

    // Strategy-based selection
    if (strategy === ProviderStrategy.OLLAMA_ONLY) {
      return ollamaAvailable ? 'ollama' : null;
    }

    if (strategy === ProviderStrategy.ANTHROPIC_ONLY) {
      return hasAnthropicAccess ? 'anthropic' : null;
    }

    // Auto/Cost-optimized selection
    if (complexity === TaskComplexity.SIMPLE) {
      // Simple tasks: prefer Ollama (free)
      return ollamaAvailable ? 'ollama' : hasAnthropicAccess ? 'anthropic' : null;
    }

    if (complexity === TaskComplexity.MODERATE) {
      // Moderate: prefer Haiku if cost-optimized, otherwise Ollama
      if (strategy === ProviderStrategy.COST_OPTIMIZED && ollamaAvailable) {
        return 'ollama';
      }
      return hasAnthropicAccess ? 'anthropic' : ollamaAvailable ? 'ollama' : null;
    }

    if (complexity === TaskComplexity.COMPLEX) {
      // Complex: prefer Anthropic (better quality)
      return hasAnthropicAccess ? 'anthropic' : ollamaAvailable ? 'ollama' : null;
    }

    return null;
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(request: TaskRequest): string {
    return `${request.category}:${request.prompt.substring(0, 100)}`;
  }

  /**
   * Check cache for recent response
   */
  private getCachedResponse(request: TaskRequest): string | null {
    const key = this.getCacheKey(request);
    const cached = this.responseCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.info('Cache hit', { category: request.category });
      return cached.response;
    }

    return null;
  }

  /**
   * Cache response
   */
  private cacheResponse(request: TaskRequest, response: string): void {
    const key = this.getCacheKey(request);
    this.responseCache.set(key, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute task with selected provider
   */
  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    // Check cache
    const cachedResponse = this.getCachedResponse(request);
    if (cachedResponse) {
      return {
        response: cachedResponse,
        provider: 'ollama',
        model: 'cached',
        duration: 0,
        cached: true,
      };
    }

    // Select provider
    const provider = await this.selectProvider(request);

    if (!provider) {
      throw new Error('No AI provider available for this task');
    }

    let response: string;
    let model: string;

    try {
      if (provider === 'ollama') {
        // Use Ollama
        model = config.ollama.defaultModel;
        response = await ollamaClient.generate(request.prompt, {
          model,
          temperature: request.temperature || 0.7,
          maxTokens: request.maxTokens || 500,
        });
      } else {
        // Use Anthropic
        if (!request.userId) {
          throw new Error('User ID required for Anthropic API');
        }

        const complexity = request.complexity || this.getCategoryComplexity(request.category!);

        // Use Haiku for moderate, Sonnet for complex
        model = complexity === TaskComplexity.COMPLEX
          ? 'claude-3-5-sonnet-20241022'
          : 'claude-3-5-haiku-20241022';

        const client = createAnthropicClient(request.userId);
        response = await client.generateText(request.prompt, {
          model,
          maxTokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
        });
      }

      const duration = Date.now() - startTime;

      // Cache response
      this.cacheResponse(request, response);

      logger.info('Task executed successfully', {
        provider,
        model,
        duration,
        category: request.category,
        complexity: request.complexity,
      });

      return {
        response,
        provider,
        model,
        duration,
        cached: false,
      };
    } catch (error: any) {
      logger.error('Task execution failed', {
        provider,
        error: error.message,
        category: request.category,
      });
      throw error;
    }
  }

  /**
   * Batch execute multiple tasks
   */
  async executeBatch(requests: TaskRequest[]): Promise<TaskResponse[]> {
    return Promise.all(requests.map((req) => this.executeTask(req)));
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<{
    ollama: { available: boolean; models?: string[] };
    anthropic: { configured: boolean };
  }> {
    const [ollamaAvailable, models] = await Promise.all([
      ollamaClient.ping(),
      ollamaClient.ping().then((available) =>
        available ? ollamaClient.listModels().then((m) => m.map((model) => model.name)) : []
      ),
    ]);

    return {
      ollama: {
        available: ollamaAvailable,
        models: models as string[],
      },
      anthropic: {
        configured: Boolean(config.anthropic.clientId && config.anthropic.clientSecret),
      },
    };
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    logger.info('Response cache cleared');
  }
}

/**
 * Default orchestrator instance
 */
export const agentOrchestrator = new AgentOrchestrator();

/**
 * Helper functions for common tasks
 */

export async function moderateContent(content: string): Promise<{
  isSafe: boolean;
  reason?: string;
}> {
  const response = await agentOrchestrator.executeTask({
    prompt: `Analyze this content for safety (dating app context). Reply with "SAFE" or "UNSAFE: reason".\n\nContent: ${content}`,
    category: TaskCategory.CONTENT_MODERATION,
    maxTokens: 50,
  });

  const isSafe = response.response.toUpperCase().includes('SAFE');
  const reason = !isSafe ? response.response.replace(/^UNSAFE:\s*/i, '') : undefined;

  return { isSafe, reason };
}

export async function detectSpam(message: string): Promise<boolean> {
  const response = await agentOrchestrator.executeTask({
    prompt: `Is this a spam message? Reply only "YES" or "NO".\n\nMessage: ${message}`,
    category: TaskCategory.SPAM_DETECTION,
    maxTokens: 10,
  });

  return response.response.toUpperCase().includes('YES');
}

export async function analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  const response = await agentOrchestrator.executeTask({
    prompt: `Analyze sentiment. Reply only: "positive", "negative", or "neutral".\n\nText: ${text}`,
    category: TaskCategory.SENTIMENT_ANALYSIS,
    maxTokens: 10,
  });

  const sentiment = response.response.toLowerCase().trim();
  if (sentiment.includes('positive')) return 'positive';
  if (sentiment.includes('negative')) return 'negative';
  return 'neutral';
}
