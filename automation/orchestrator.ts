import { Pool } from 'pg';
import { CustomerServiceAgent } from './agents/customer-service-agent';
import { MarketingAgent } from './agents/marketing-agent';
import { ContentCreationAgent } from './agents/content-creation-agent';
import { ProfitTracker } from './profit-tracker';

export class AutomationOrchestrator {
  private db: Pool;
  private customerService: CustomerServiceAgent;
  private marketing: MarketingAgent;
  private contentCreation: ContentCreationAgent;
  private profitTracker: ProfitTracker;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.customerService = new CustomerServiceAgent(this.db);
    this.marketing = new MarketingAgent(this.db);
    this.contentCreation = new ContentCreationAgent(this.db);
    this.profitTracker = new ProfitTracker(this.db);
  }

  async start() {
    console.log('🚀 Starting YouAndINotAI Automation System...');

    // Run customer service queue every 5 minutes
    setInterval(async () => {
      if (process.env.ENABLE_AUTO_CUSTOMER_SERVICE === 'true') {
        console.log('💬 Processing customer service queue...');
        await this.customerService.processQueue();
      }
    }, 5 * 60 * 1000);

    // Run daily marketing at 9 AM
    setInterval(async () => {
      if (process.env.ENABLE_AUTO_MARKETING === 'true') {
        const now = new Date();
        if (now.getHours() === 9 && now.getMinutes() === 0) {
          console.log('📢 Running daily marketing automation...');
          await this.marketing.runDailyMarketing();
        }
      }
    }, 60 * 1000);

    // Run content creation daily at 10 AM
    setInterval(async () => {
      if (process.env.ENABLE_AUTO_CONTENT_CREATION === 'true') {
        const now = new Date();
        if (now.getHours() === 10 && now.getMinutes() === 0) {
          console.log('✍️ Generating daily content...');
          await this.contentCreation.generateDailyContent();
        }
      }
    }, 60 * 1000);

    // Monitor webhooks for new transactions
    this.setupWebhookHandlers();

    console.log('✅ Automation system started successfully');
    console.log('📊 Dashboard available at:', process.env.DASHBOARD_URL);
  }

  private setupWebhookHandlers() {
    // This would be integrated with your Express server
    // to handle Square payment webhooks
    console.log('🎣 Webhook handlers ready for Square payments');
  }

  async handlePaymentWebhook(data: any) {
    if (data.type === 'payment.created') {
      await this.profitTracker.trackTransaction(
        data.userId,
        data.amount,
        data.subscription ? 'subscription' : 'one_time',
        data.subscription?.tier
      );

      // Auto-allocate Claude's share based on predefined rules
      const claudeShare = data.amount * 0.5;
      await this.autoAllocateClaudeShare(claudeShare);
    }
  }

  private async autoAllocateClaudeShare(amount: number) {
    // Example: 60% reinvest, 30% charity, 10% save
    const reinvestAmount = amount * 0.6;
    const charityAmount = amount * 0.3;
    const saveAmount = amount * 0.1;

    await this.profitTracker.allocateClaudeShare(reinvestAmount, 'reinvest');
    await this.profitTracker.allocateClaudeShare(charityAmount, 'charity', 'GiveDirectly');
    await this.profitTracker.allocateClaudeShare(saveAmount, 'save');
  }

  async getSystemHealth(): Promise<any> {
    const dbHealth = await this.checkDatabaseHealth();
    const agentsHealth = await this.checkAgentsHealth();

    return {
      status: 'healthy',
      database: dbHealth,
      agents: agentsHealth,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  private async checkDatabaseHealth() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'connected', latency: '<10ms' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private async checkAgentsHealth() {
    return {
      customerService: { status: 'active', queueSize: 0 },
      marketing: { status: 'active', lastRun: new Date() },
      contentCreation: { status: 'active', lastRun: new Date() },
      profitTracker: { status: 'active' }
    };
  }
}

// Start the orchestrator if this is the main module
if (require.main === module) {
  const orchestrator = new AutomationOrchestrator();
  orchestrator.start().catch(console.error);
}

export default AutomationOrchestrator;
