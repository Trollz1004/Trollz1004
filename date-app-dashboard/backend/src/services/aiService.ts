/**
 * AI Service - Self-Hosted First Strategy
 *
 * Priority:
 * 1. Ollama (FREE - Self-hosted on T5500)
 * 2. Gemini (PAID - Cloud fallback)
 * 3. Perplexity (PAID - Web search only)
 *
 * Cost Savings: 77% reduction ($780/year → $180/year)
 */

import axios from 'axios';

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://192.168.1.100:11434';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const USE_SELF_HOSTED_FIRST = process.env.USE_SELF_HOSTED_FIRST !== 'false';

// Model Configuration
const OLLAMA_MODELS = {
  text: 'llama3.1:8b',
  code: 'codellama:13b',
  vision: 'llava:7b',
  fast: 'mistral:7b'
};

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  provider: string;
  model: string;
  cost: number;
  response: string;
  cached?: boolean;
}

interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  useWeb?: boolean;
  modelType?: 'text' | 'code' | 'vision' | 'fast';
}

class AIService {
  /**
   * Generate text using self-hosted AI first, cloud as fallback
   */
  async chat(
    messages: AIMessage[],
    options: AIOptions = {}
  ): Promise<AIResponse> {
    const {
      temperature = 0.7,
      maxTokens = 500,
      useWeb = false,
      modelType = 'text'
    } = options;

    try {
      // STRATEGY 1: Try Ollama first (FREE, self-hosted)
      if (USE_SELF_HOSTED_FIRST && !useWeb) {
        try {
          const ollamaResponse = await this.callOllama(messages, modelType, temperature);
          console.log('✅ AI Request: Ollama (self-hosted, $0 cost)');
          return ollamaResponse;
        } catch (ollamaError) {
          console.warn('⚠️ Ollama unavailable, trying cloud fallback:', (ollamaError as Error).message);
        }
      }

      // STRATEGY 2: Fallback to Gemini (PAID, but cheaper than Perplexity)
      if (GEMINI_API_KEY && !useWeb) {
        try {
          const geminiResponse = await this.callGemini(messages, temperature, maxTokens);
          console.log('💰 AI Request: Gemini (cloud, ~$0.0005 cost)');
          return geminiResponse;
        } catch (geminiError) {
          console.warn('⚠️ Gemini failed:', (geminiError as Error).message);
        }
      }

      // STRATEGY 3: Fallback to Perplexity (PAID, for web search or last resort)
      if (PERPLEXITY_API_KEY) {
        const perplexityResponse = await this.callPerplexity(messages, temperature, maxTokens);
        console.log('💰 AI Request: Perplexity (cloud, ~$0.001 cost)');
        return perplexityResponse;
      }

      throw new Error('No AI providers available');

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  /**
   * Call Ollama (self-hosted, FREE)
   */
  private async callOllama(
    messages: AIMessage[],
    modelType: 'text' | 'code' | 'vision' | 'fast',
    temperature: number
  ): Promise<AIResponse> {
    const model = OLLAMA_MODELS[modelType];
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature
        }
      },
      { timeout: 15000 } // 15 second timeout
    );

    return {
      provider: 'ollama',
      model,
      cost: 0,
      response: response.data.response
    };
  }

  /**
   * Call Google Gemini (cloud, PAID)
   */
  private async callGemini(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const contents = messages.map(m => ({
      parts: [{ text: m.content }],
      role: m.role === 'assistant' ? 'model' : 'user'
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      },
      { timeout: 10000 }
    );

    return {
      provider: 'gemini',
      model: 'gemini-pro',
      cost: 0.0005, // Approximate cost
      response: response.data.candidates[0].content.parts[0].text
    };
  }

  /**
   * Call Perplexity AI (cloud, PAID, web search capable)
   */
  private async callPerplexity(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      provider: 'perplexity',
      model: 'llama-3.1-sonar-small-128k-online',
      cost: 0.001, // Approximate cost
      response: response.data.choices[0].message.content
    };
  }

  /**
   * Generate profile bio using AI
   */
  async generateProfileBio(userData: {
    name: string;
    age: number;
    interests: string[];
    occupation?: string;
  }): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a dating profile expert. Generate engaging, authentic bios that highlight personality and interests.'
      },
      {
        role: 'user',
        content: `Generate a dating profile bio for ${userData.name}, age ${userData.age}. Interests: ${userData.interests.join(', ')}${userData.occupation ? `. Occupation: ${userData.occupation}` : ''}. Keep it under 150 characters, friendly and authentic.`
      }
    ];

    const result = await this.chat(messages, { temperature: 0.8, modelType: 'fast' });
    return result.response;
  }

  /**
   * Generate conversation starter
   */
  async generateConversationStarter(matchData: {
    theirName: string;
    theirInterests: string[];
    commonInterests: string[];
  }): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a dating conversation expert. Generate natural, engaging ice breakers.'
      },
      {
        role: 'user',
        content: `Suggest an ice breaker message to ${matchData.theirName}. Their interests: ${matchData.theirInterests.join(', ')}. Common interests: ${matchData.commonInterests.join(', ')}. Keep it under 100 characters, casual and friendly.`
      }
    ];

    const result = await this.chat(messages, { temperature: 0.9, modelType: 'fast' });
    return result.response;
  }

  /**
   * Generate social media marketing content
   */
  async generateMarketingContent(contentType: 'twitter' | 'instagram' | 'reddit', topic: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a social media marketing expert for a dating platform called "YouAndINotAI" - an ethical, AI-powered dating app.`
      },
      {
        role: 'user',
        content: `Create a ${contentType} post about: ${topic}. Make it engaging, authentic, and encourage signups. Include relevant hashtags.`
      }
    ];

    const result = await this.chat(messages, { temperature: 0.8, modelType: 'text' });
    return result.response;
  }

  /**
   * Analyze and improve content for virality
   */
  async improveContentVirality(originalContent: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a viral content expert. Improve content to be more engaging, shareable, and viral while keeping authenticity.'
      },
      {
        role: 'user',
        content: `Improve this content for virality: "${originalContent}"`
      }
    ];

    const result = await this.chat(messages, { temperature: 0.7, modelType: 'text' });
    return result.response;
  }

  /**
   * Generate personalized date ideas
   */
  async generateDateIdeas(preferences: {
    location?: string;
    interests: string[];
    budget?: 'low' | 'medium' | 'high';
  }): Promise<string[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a dating expert. Suggest creative, personalized date ideas.'
      },
      {
        role: 'user',
        content: `Suggest 3 date ideas based on: Interests: ${preferences.interests.join(', ')}${preferences.location ? `, Location: ${preferences.location}` : ''}${preferences.budget ? `, Budget: ${preferences.budget}` : ''}. Return as numbered list.`
      }
    ];

    const result = await this.chat(messages, { temperature: 0.8, modelType: 'text' });
    return result.response.split('\n').filter(line => line.trim().match(/^\d\./));
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<{
    ollama: boolean;
    gemini: boolean;
    perplexity: boolean;
    strategy: string;
    estimatedMonthlyCost: string;
  }> {
    const health = {
      ollama: false,
      gemini: !!GEMINI_API_KEY,
      perplexity: !!PERPLEXITY_API_KEY,
      strategy: USE_SELF_HOSTED_FIRST ? 'self-hosted-first' : 'cloud-first',
      estimatedMonthlyCost: '$65'
    };

    // Check Ollama
    try {
      await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 2000 });
      health.ollama = true;
      health.estimatedMonthlyCost = '$5'; // Electricity only
    } catch {
      health.ollama = false;
    }

    return health;
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
