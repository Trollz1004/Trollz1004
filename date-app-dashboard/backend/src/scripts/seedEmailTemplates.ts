import { pool } from '../database';
import logger from '../logger';

interface EmailTemplate {
  name: string;
  subject_line: string;
  html_content: string;
  plain_text_content: string;
  variables: string[];
}

const emailTemplates: EmailTemplate[] = [
  {
    name: 'badge_earned',
    subject_line: '🏆 Congratulations! You Earned the {{badgeName}} Badge!',
    html_content: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Badge Earned!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .badge-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    .badge-name {
      font-size: 32px;
      font-weight: bold;
      color: #FF6B6B;
      margin-bottom: 10px;
    }
    .badge-description {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .reward-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .reward-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .reward-value {
      font-size: 24px;
      font-weight: bold;
    }
    .cta-button {
      display: inline-block;
      padding: 15px 30px;
      background-color: #FF6B6B;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 14px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge-icon">🏆</div>
      <h1 class="badge-name">{{badgeName}}</h1>
      <p class="badge-description">{{badgeDescription}}</p>
    </div>
    
    <p>Hey {{userName}},</p>
    
    <p>Amazing news! You've just earned the <strong>{{badgeName}}</strong> badge! 🎉</p>
    
    <p>Your dedication and activity on Trollz1004 haven't gone unnoticed. You're now part of an elite group of users who have achieved this milestone!</p>
    
    {{#if rewardType}}
    <div class="reward-box">
      <div class="reward-title">🎁 Your Reward</div>
      <div class="reward-value">
        {{#if (eq rewardType 'premium_days')}}
          {{rewardValue}} Days of Premium Access!
        {{/if}}
        {{#if (eq rewardType 'extra_swipes')}}
          {{rewardValue}} Extra Swipes!
        {{/if}}
        {{#if (eq rewardType 'special_status')}}
          {{rewardValue}} Status Unlocked!
        {{/if}}
        {{#if (eq rewardType 'feature_unlock')}}
          {{rewardValue}} Feature Unlocked!
        {{/if}}
      </div>
    </div>
    {{/if}}
    
    <p>Keep up the great work and continue exploring Trollz1004 to unlock even more badges and rewards!</p>
    
    <center>
      <a href="https://trollz1004.com/badges" class="cta-button">View All Your Badges</a>
    </center>
    
    <div class="footer">
      <p>Happy matching! ❤️<br>The Trollz1004 Team</p>
      <p><a href="https://trollz1004.com/settings">Manage Email Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `,
    plain_text_content: `
🏆 Congratulations {{userName}}!

You've earned the {{badgeName}} badge!

{{badgeDescription}}

{{#if rewardType}}
YOUR REWARD:
{{#if (eq rewardType 'premium_days')}}
✨ {{rewardValue}} Days of Premium Access!
{{/if}}
{{#if (eq rewardType 'extra_swipes')}}
💫 {{rewardValue}} Extra Swipes!
{{/if}}
{{#if (eq rewardType 'special_status')}}
⭐ {{rewardValue}} Status Unlocked!
{{/if}}
{{#if (eq rewardType 'feature_unlock')}}
🔓 {{rewardValue}} Feature Unlocked!
{{/if}}
{{/if}}

Your dedication and activity on Trollz1004 haven't gone unnoticed. You're now part of an elite group of users who have achieved this milestone!

Keep up the great work and continue exploring to unlock even more badges and rewards!

View all your badges: https://trollz1004.com/badges

Happy matching! ❤️
The Trollz1004 Team

Manage your email preferences: https://trollz1004.com/settings
    `,
    variables: ['userName', 'badgeName', 'badgeDescription', 'rewardType', 'rewardValue'],
  },
];

async function seedEmailTemplates(): Promise<void> {
  try {
    logger.info('Starting email template seeding...');

    for (const template of emailTemplates) {
      try {
        // Check if template already exists
        const existingTemplate = await pool.query(
          'SELECT id FROM email_templates WHERE name = $1',
          [template.name]
        );

        if (existingTemplate.rows.length > 0) {
          // Update existing template
          await pool.query(
            `UPDATE email_templates 
             SET subject_line = $1, 
                 html_content = $2, 
                 plain_text_content = $3, 
                 variables = $4, 
                 updated_at = NOW()
             WHERE name = $5`,
            [
              template.subject_line,
              template.html_content,
              template.plain_text_content,
              JSON.stringify(template.variables),
              template.name,
            ]
          );
          logger.info(`Updated email template: ${template.name}`);
        } else {
          // Insert new template
          await pool.query(
            `INSERT INTO email_templates (name, subject_line, html_content, plain_text_content, variables, is_active)
             VALUES ($1, $2, $3, $4, $5, true)`,
            [
              template.name,
              template.subject_line,
              template.html_content,
              template.plain_text_content,
              JSON.stringify(template.variables),
            ]
          );
          logger.info(`Created email template: ${template.name}`);
        }
      } catch (error: any) {
        logger.error(`Failed to seed template ${template.name}`, { error: error.message });
        throw error;
      }
    }

    logger.info('Email template seeding completed successfully!');
    logger.info(`Total templates processed: ${emailTemplates.length}`);

    // Display summary
    console.log('\n📧 Email Template Seeding Summary');
    console.log('=====================================');
    emailTemplates.forEach((template) => {
      console.log(`✅ ${template.name}`);
      console.log(`   Subject: ${template.subject_line}`);
      console.log(`   Variables: ${template.variables.join(', ')}`);
    });
    console.log('=====================================\n');

    process.exit(0);
  } catch (error: any) {
    logger.error('Email template seeding failed', { error: error.message });
    console.error('❌ Email template seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedEmailTemplates();
