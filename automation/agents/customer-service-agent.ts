import axios from 'axios';
import { Pool } from 'pg';

export class CustomerServiceAgent {
  private perplexityApiKey: string;
  private db: Pool;

  constructor(db: Pool) {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.db = db;
  }

  async handleCustomerQuery(userId: string, message: string): Promise<string> {
    const userContext = await this.getUserContext(userId);

    const prompt = `You are a helpful customer service agent for YouAndINotAI dating platform.
User Context: ${JSON.stringify(userContext)}
User Question: ${message}

Provide a helpful, empathetic response. If it's a billing question, provide account details. If technical, troubleshoot. Always be professional and helpful.`;

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    await this.logInteraction(userId, message, aiResponse);

    return aiResponse;
  }

  private async getUserContext(userId: string) {
    const result = await this.db.query(`
      SELECT u.email, u.created_at, s.tier, s.status,
             COUNT(m.id) as total_matches
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN matches m ON (m.user_id_a = u.id OR m.user_id_b = u.id)
      WHERE u.id = $1
      GROUP BY u.id, s.tier, s.status
    `, [userId]);

    return result.rows[0] || {};
  }

  private async logInteraction(userId: string, query: string, response: string) {
    await this.db.query(`
      INSERT INTO customer_service_logs (user_id, query, ai_response, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, query, response]);
  }

  async processQueue() {
    const pendingQueries = await this.db.query(`
      SELECT * FROM customer_queries
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `);

    for (const query of pendingQueries.rows) {
      try {
        const response = await this.handleCustomerQuery(query.user_id, query.message);

        await this.db.query(`
          UPDATE customer_queries
          SET status = 'resolved', ai_response = $1, updated_at = NOW()
          WHERE id = $2
        `, [response, query.id]);

        await this.notifyUser(query.user_id, response);
      } catch (error) {
        console.error(`Error processing query ${query.id}:`, error);
      }
    }
  }

  private async notifyUser(userId: string, message: string) {
    // Send email/push notification
    await this.db.query(`
      INSERT INTO notifications (user_id, type, message, created_at)
      VALUES ($1, 'customer_service_response', $2, NOW())
    `, [userId, message]);
  }
}
