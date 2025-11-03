import axios from 'axios';
import { Pool } from 'pg';

export class ContentCreationAgent {
  private perplexityApiKey: string;
  private db: Pool;

  constructor(db: Pool) {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.db = db;
  }

  async generateDailyContent(): Promise<void> {
    await Promise.all([
      this.createBlogPost(),
      this.createSocialMediaPosts(),
      this.createEmailNewsletter(),
      this.createSuccessStories(),
    ]);
  }

  private async createBlogPost() {
    const prompt = `Write a 800-word blog post for YouAndINotAI dating platform.
    Topic: Dating tips, relationship advice, or platform features.
    Make it engaging, SEO-optimized, and authentic.
    Include: Title, Meta Description, Body with headers, Call-to-Action`;

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

    const blogPost = response.data.choices[0].message.content;

    await this.db.query(`
      INSERT INTO blog_posts (title, content, status, created_at, publish_at)
      VALUES ($1, $2, 'draft', NOW(), NOW() + INTERVAL '1 day')
    `, ['AI Generated Post', blogPost]);
  }

  private async createSocialMediaPosts() {
    const prompt = `Create 10 engaging social media posts for YouAndINotAI dating platform.
    Mix of:
    - Dating tips
    - Success story highlights
    - Feature showcases
    - Motivational quotes
    - Community engagement questions

    Format: [Platform] - Post content (with hashtags)`;

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

    const posts = response.data.choices[0].message.content;

    await this.db.query(`
      INSERT INTO social_media_queue (content, status, created_at)
      VALUES ($1, 'pending', NOW())
    `, [posts]);
  }

  private async createEmailNewsletter() {
    const platformStats = await this.getWeeklyStats();

    const prompt = `Create an engaging email newsletter for YouAndINotAI users.

    Include:
    - Weekly platform highlights (${platformStats.newMatches} new matches, ${platformStats.newMembers} new members)
    - Dating tip of the week
    - Success story feature
    - Upcoming features teaser
    - Call-to-action

    Make it personal, warm, and encouraging.`;

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

    const newsletter = response.data.choices[0].message.content;

    await this.db.query(`
      INSERT INTO email_campaigns (subject, content, status, created_at, send_at)
      VALUES ('Weekly Newsletter', $1, 'draft', NOW(), NOW() + INTERVAL '2 days')
    `, [newsletter]);
  }

  private async createSuccessStories() {
    const recentMatches = await this.db.query(`
      SELECT m.id, u1.email as user_a, u2.email as user_b,
             m.created_at, COUNT(msg.id) as message_count
      FROM matches m
      JOIN users u1 ON m.user_id_a = u1.id
      JOIN users u2 ON m.user_id_b = u2.id
      LEFT JOIN messages msg ON m.id = msg.match_id
      WHERE m.created_at > NOW() - INTERVAL '7 days'
      GROUP BY m.id, u1.email, u2.email
      HAVING COUNT(msg.id) > 50
      ORDER BY COUNT(msg.id) DESC
      LIMIT 5
    `);

    for (const match of recentMatches.rows) {
      const prompt = `Create an inspiring success story snippet based on this match data:
      - Match created: ${match.created_at}
      - Messages exchanged: ${match.message_count}

      Write a brief, anonymous success story (100 words) highlighting their connection.
      Make it genuine and heartwarming.`;

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

      const story = response.data.choices[0].message.content;

      await this.db.query(`
        INSERT INTO success_stories (match_id, story, status, created_at)
        VALUES ($1, $2, 'pending_approval', NOW())
      `, [match.id, story]);
    }
  }

  private async getWeeklyStats() {
    const result = await this.db.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN m.id END) as new_matches,
        COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as new_members
      FROM matches m
      CROSS JOIN users u
    `);

    return result.rows[0];
  }
}
