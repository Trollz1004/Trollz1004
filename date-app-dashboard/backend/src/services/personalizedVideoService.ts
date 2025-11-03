import { Pool } from 'pg';
import axios from 'axios';
import logger from '../logger';

interface VideoOrderRequest {
  buyerId: string;
  recipientId: string;
  videoType: 'romantic' | 'flirty' | 'funny' | 'sincere' | 'custom';
  customPrompt?: string;
  priceUsd: number;
  paymentIntentId: string;
}

interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  generationTimeSeconds: number;
}

export class PersonalizedVideoService {
  private pool: Pool;
  private runwayApiKey: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.runwayApiKey = process.env.RUNWAY_API_KEY || '';
  }

  /**
   * Create a personalized video order
   * Expected revenue: $5-20 per video, 250-750 videos/month = $5K-15K/month
   */
  async createVideoOrder(request: VideoOrderRequest): Promise<string> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO personalized_video_orders (
          buyer_id, recipient_id, video_type, custom_prompt, 
          price_usd, payment_intent_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
        RETURNING id`,
        [
          request.buyerId,
          request.recipientId,
          request.videoType,
          request.customPrompt,
          request.priceUsd,
          request.paymentIntentId
        ]
      );

      const orderId = result.rows[0].id;
      logger.info(`💸 Video order created: ${orderId} - $${request.priceUsd}`);

      // Trigger async video generation
      this.generateVideo(orderId).catch(err => {
        logger.error(`Video generation failed for ${orderId}:`, err);
      });

      return orderId;
    } finally {
      client.release();
    }
  }

  /**
   * Generate personalized video using Runway ML Gen-3 Alpha
   * Uses AI to create romantic, flirty, or funny videos
   */
  private async generateVideo(orderId: string): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      // Update status to generating
      await client.query(
        `UPDATE personalized_video_orders SET status = 'generating' WHERE id = $1`,
        [orderId]
      );

      // Fetch order details
      const orderResult = await client.query(
        `SELECT pvo.*, 
          buyer.display_name as buyer_name,
          recipient.display_name as recipient_name,
          recipient.avatar_url
        FROM personalized_video_orders pvo
        JOIN users buyer ON pvo.buyer_id = buyer.id
        JOIN users recipient ON pvo.recipient_id = recipient.id
        WHERE pvo.id = $1`,
        [orderId]
      );

      const order = orderResult.rows[0];

      // Build AI prompt based on video type
      const prompt = this.buildVideoPrompt(order);

      // Generate video with Runway ML
      const videoGeneration = await this.callRunwayML(prompt, order.avatar_url);

      // Store video details
      const generationTime = Math.floor((Date.now() - startTime) / 1000);
      
      await client.query(
        `UPDATE personalized_video_orders 
        SET status = 'completed',
            video_url = $1,
            thumbnail_url = $2,
            duration_seconds = $3,
            generation_time_seconds = $4,
            generated_at = NOW()
        WHERE id = $5`,
        [
          videoGeneration.videoUrl,
          videoGeneration.thumbnailUrl,
          videoGeneration.durationSeconds,
          generationTime,
          orderId
        ]
      );

      // Notify recipient
      await this.notifyRecipient(order.recipient_id, order.buyer_name, videoGeneration.videoUrl);

      logger.info(`✅ Video generated successfully: ${orderId} in ${generationTime}s`);
    } catch (error) {
      await client.query(
        `UPDATE personalized_video_orders SET status = 'failed' WHERE id = $1`,
        [orderId]
      );
      logger.error(`❌ Video generation failed for ${orderId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build AI prompt for video generation
   */
  private buildVideoPrompt(order: any): string {
    const basePrompts = {
      romantic: `Create a romantic, dreamy video montage featuring a person who looks like the uploaded photo. 
        Soft lighting, warm colors, gentle movements. Include rose petals, sunset scenes, candlelit atmosphere. 
        4K quality, cinematic, heartwarming.`,
      
      flirty: `Create a playful, flirty video featuring a person who looks like the uploaded photo. 
        Bright colors, energetic movements, fun transitions. Winks, smiles, confident poses. 
        Modern aesthetic, social media style, engaging and light-hearted.`,
      
      funny: `Create a humorous, entertaining video featuring a person who looks like the uploaded photo. 
        Unexpected scenarios, exaggerated expressions, comedic timing. Meme-worthy moments. 
        High energy, colorful, shareable content.`,
      
      sincere: `Create a heartfelt, sincere video featuring a person who looks like the uploaded photo. 
        Natural lighting, genuine expressions, emotional depth. Honest and authentic vibe. 
        Documentary style, real moments, touching and meaningful.`,
      
      custom: order.custom_prompt || 'Create a beautiful, engaging video.'
    };

    return basePrompts[order.video_type as keyof typeof basePrompts] || basePrompts.sincere;
  }

  /**
   * Call Runway ML Gen-3 Alpha API
   */
  private async callRunwayML(prompt: string, imageUrl?: string): Promise<VideoGenerationResult> {
    try {
      const response = await axios.post(
        'https://api.runwayml.com/v1/gen3/text-to-video',
        {
          model: 'gen3a_turbo',
          prompt: prompt,
          image: imageUrl,
          duration: 5,
          ratio: '16:9',
          watermark: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.runwayApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutes
        }
      );

      // Poll for completion
      const taskId = response.data.id;
      let videoUrl = '';
      let attempts = 0;

      while (!videoUrl && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
        
        const statusResponse = await axios.get(
          `https://api.runwayml.com/v1/tasks/${taskId}`,
          {
            headers: { 'Authorization': `Bearer ${this.runwayApiKey}` }
          }
        );

        if (statusResponse.data.status === 'SUCCEEDED') {
          videoUrl = statusResponse.data.output[0];
        } else if (statusResponse.data.status === 'FAILED') {
          throw new Error('Runway ML generation failed');
        }
        attempts++;
      }

      if (!videoUrl) {
        throw new Error('Video generation timeout');
      }

      return {
        videoUrl,
        thumbnailUrl: videoUrl.replace('.mp4', '-thumb.jpg'),
        durationSeconds: 5,
        generationTimeSeconds: attempts * 5
      };
    } catch (error) {
      logger.error('Runway ML API error:', error);
      throw new Error('Failed to generate video with AI');
    }
  }

  /**
   * Notify recipient that they have a personalized video
   */
  private async notifyRecipient(recipientId: string, buyerName: string, videoUrl: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO notifications (user_id, type, message, data)
        VALUES ($1, 'personalized_video', $2, $3)`,
        [
          recipientId,
          `${buyerName} sent you a personalized video! 💝`,
          JSON.stringify({ videoUrl, buyerName })
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get video order status
   */
  async getOrderStatus(orderId: string, userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM personalized_video_orders 
        WHERE id = $1 AND (buyer_id = $2 OR recipient_id = $2)`,
        [orderId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Mark video as viewed by recipient
   */
  async markVideoViewed(orderId: string, recipientId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE personalized_video_orders 
        SET viewed_at = NOW(), status = 'delivered'
        WHERE id = $1 AND recipient_id = $2 AND viewed_at IS NULL`,
        [orderId, recipientId]
      );

      logger.info(`📹 Video viewed: ${orderId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get revenue stats for personalized videos
   */
  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
          SUM(price_usd) FILTER (WHERE status = 'completed') as total_revenue,
          AVG(price_usd) FILTER (WHERE status = 'completed') as avg_order_value,
          AVG(generation_time_seconds) as avg_generation_time,
          COUNT(*) FILTER (WHERE viewed_at IS NOT NULL) as videos_viewed
        FROM personalized_video_orders
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)`,
        [startDate || null, endDate || null]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
