import axios, { AxiosInstance } from 'axios';
import config from '../config';
import logger from '../logger';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

/**
 * Ollama API Client for self-hosted LLM integration
 */
export class OllamaClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.ollama.baseUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes for generation
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if Ollama server is available
   */
  async ping(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/api/tags');
      return true;
    } catch (error) {
      logger.error('Ollama server not available', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.axiosInstance.get('/api/tags');
      return response.data.models || [];
    } catch (error: any) {
      logger.error('Failed to list Ollama models', {
        error: error.message,
        baseUrl: this.baseUrl,
      });
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      logger.info('Pulling Ollama model', { model: modelName });
      await this.axiosInstance.post('/api/pull', { name: modelName });
      logger.info('Successfully pulled model', { model: modelName });
    } catch (error: any) {
      logger.error('Failed to pull Ollama model', {
        model: modelName,
        error: error.message,
      });
      throw new Error(`Failed to pull model: ${error.message}`);
    }
  }

  /**
   * Generate text completion
   */
  async generate(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const model = options.model || config.ollama.defaultModel;

    try {
      const request: OllamaGenerateRequest = {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      };

      const response = await this.axiosInstance.post<OllamaGenerateResponse>(
        '/api/generate',
        request
      );

      logger.info('Ollama generation completed', {
        model,
        promptLength: prompt.length,
        responseLength: response.data.response.length,
        evalCount: response.data.eval_count,
      });

      return response.data.response;
    } catch (error: any) {
      logger.error('Ollama generation failed', {
        model,
        error: error.message,
      });
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: OllamaMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const model = options.model || config.ollama.defaultModel;

    try {
      const request: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      };

      const response = await this.axiosInstance.post<OllamaChatResponse>('/api/chat', request);

      logger.info('Ollama chat completed', {
        model,
        messageCount: messages.length,
        responseLength: response.data.message.content.length,
      });

      return response.data.message.content;
    } catch (error: any) {
      logger.error('Ollama chat failed', {
        model,
        error: error.message,
      });
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some((m) => m.name.includes(modelName));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get embeddings for text
   */
  async embed(text: string, model?: string): Promise<number[]> {
    const embeddingModel = model || 'nomic-embed-text';

    try {
      const response = await this.axiosInstance.post('/api/embeddings', {
        model: embeddingModel,
        prompt: text,
      });

      return response.data.embedding || [];
    } catch (error: any) {
      logger.error('Ollama embedding failed', {
        model: embeddingModel,
        error: error.message,
      });
      throw new Error(`Embedding failed: ${error.message}`);
    }
  }
}

/**
 * Factory function to create Ollama client
 */
export function createOllamaClient(baseUrl?: string): OllamaClient {
  return new OllamaClient(baseUrl);
}

/**
 * Default Ollama client instance
 */
export const ollamaClient = createOllamaClient();
