import axios, { AxiosInstance } from 'axios';
import { getValidAccessToken } from './anthropicOAuthService';
import config from '../config';
import logger from '../logger';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicCompletionRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  metadata?: Record<string, any>;
  stop_sequences?: string[];
  stream?: boolean;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

/**
 * Anthropic API Client
 * Handles authenticated requests to Anthropic's API
 */
export class AnthropicApiClient {
  private userId: string;
  private axiosInstance: AxiosInstance;

  constructor(userId: string) {
    this.userId = userId;
    this.axiosInstance = axios.create({
      baseURL: config.anthropic.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
    });
  }

  /**
   * Gets the authorization header with a valid access token
   */
  private async getAuthHeader(): Promise<{ Authorization: string }> {
    const accessToken = await getValidAccessToken(this.userId);
    return { Authorization: `Bearer ${accessToken}` };
  }

  /**
   * Get user profile from Anthropic
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      const authHeader = await this.getAuthHeader();
      const response = await this.axiosInstance.get('/v1/user/profile', {
        headers: authHeader,
      });

      logger.info('Retrieved Anthropic user profile', { userId: this.userId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get user profile', {
        userId: this.userId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Failed to retrieve user profile: ${error.message}`);
    }
  }

  /**
   * Create a message completion with Claude
   */
  async createCompletion(
    messages: AnthropicMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      topK?: number;
      stopSequences?: string[];
    } = {}
  ): Promise<AnthropicCompletionResponse> {
    try {
      const authHeader = await this.getAuthHeader();

      const requestBody: AnthropicCompletionRequest = {
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 1024,
        messages: messages,
        temperature: options.temperature,
        top_p: options.topP,
        top_k: options.topK,
        stop_sequences: options.stopSequences,
      };

      const response = await this.axiosInstance.post<AnthropicCompletionResponse>(
        '/v1/messages',
        requestBody,
        {
          headers: authHeader,
        }
      );

      logger.info('Created Anthropic completion', {
        userId: this.userId,
        model: requestBody.model,
        inputTokens: response.data.usage.input_tokens,
        outputTokens: response.data.usage.output_tokens,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create completion', {
        userId: this.userId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Failed to create completion: ${error.message}`);
    }
  }

  /**
   * Generate a simple text response from Claude
   */
  async generateText(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.createCompletion(messages, options);

    // Extract text from the response
    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || '';
  }

  /**
   * Have a conversation with Claude (multiple message exchanges)
   */
  async chat(
    conversationHistory: AnthropicMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{ response: string; usage: { inputTokens: number; outputTokens: number } }> {
    const completion = await this.createCompletion(conversationHistory, options);

    const textContent = completion.content.find((c) => c.type === 'text');
    const responseText = textContent?.text || '';

    return {
      response: responseText,
      usage: {
        inputTokens: completion.usage.input_tokens,
        outputTokens: completion.usage.output_tokens,
      },
    };
  }

  /**
   * List available models (if API supports it)
   */
  async listModels(): Promise<any> {
    try {
      const authHeader = await this.getAuthHeader();
      const response = await this.axiosInstance.get('/v1/models', {
        headers: authHeader,
      });

      logger.info('Retrieved Anthropic models list', { userId: this.userId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to list models', {
        userId: this.userId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }
}

/**
 * Factory function to create an Anthropic API client for a user
 */
export function createAnthropicClient(userId: string): AnthropicApiClient {
  return new AnthropicApiClient(userId);
}

/**
 * Helper function for quick text generation
 */
export async function generateTextForUser(
  userId: string,
  prompt: string,
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = createAnthropicClient(userId);
  return await client.generateText(prompt, options);
}

/**
 * Helper function for chat interactions
 */
export async function chatWithClaude(
  userId: string,
  messages: AnthropicMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<{ response: string; usage: { inputTokens: number; outputTokens: number } }> {
  const client = createAnthropicClient(userId);
  return await client.chat(messages, options);
}
