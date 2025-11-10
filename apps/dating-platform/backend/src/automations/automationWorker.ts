import logger from '../logger';
import { deactivateExpiredCodes } from './referral/referralCodeGenerator';
import { checkAndAwardBadges } from './referral/referralRewards';
import { logAutomation } from './utils/automationLogger';
import { processQueue, retryFailedEmails, cleanOldQueue } from './email/emailQueueService';
import {
  sendSubscriptionExpiringReminders,
  sendReengagementEmails,
} from './email/emailTriggerService';
import { processPendingTweets } from './social/twitterService';
import { processPendingInstagramStories } from './social/instagramService';
import { processPendingRedditPosts } from './social/redditService';
import { scheduleTweet } from './social/twitterService';
import { scheduleInstagramStory } from './social/instagramService';
import { scheduleRedditPost, getRandomSubreddit } from './social/redditService';
import { batchUpdateAllProgress, getUsersCloseToEarning } from './badges/badgeProgressService';
import { calculateAllLeaderboards, archiveOldLeaderboards } from './badges/leaderboardService';
import { cleanExpiredFreezes } from './badges/streakService';
import { getAllBadges } from './badges/badgeService';
import { clearExpiredCache } from './analytics/analyticsService';
import { createDailySnapshot, generateDailyReport, generateWeeklyReport, generateMonthlyReport } from './analytics/reportingService';
import { getCohortRetentionAnalysis } from './analytics/retentionService';
import {
  processSMSQueue,
  retryFailedSMS,
  sendSubscriptionReminders,
  sendDailyMatchNotifications,
} from './sms/smsService';

/**
 * Automation worker configuration
 */
const ENABLE_AUTOMATION_WORKER = process.env.ENABLE_AUTOMATION_WORKER !== 'false';
const CRON_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

/**
 * Track running intervals for graceful shutdown
 */
const activeIntervals: NodeJS.Timeout[] = [];

/**
 * Flag to track if worker is shutting down
 */
let isShuttingDown = false;

/**
 * Daily cron job: Deactivate expired referral codes
 * Runs once per day at 2 AM
 */
const dailyExpiredCodesCleanup = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Running daily expired codes cleanup');
    const deactivatedCount = await deactivateExpiredCodes();

    logger.info('Daily expired codes cleanup completed', { deactivatedCount });
  } catch (error: any) {
    logger.error('Daily expired codes cleanup failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'daily_expired_codes_cleanup',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Weekly cron job: Check and award referral badges
 * Runs once per week on Sunday at 3 AM
 */
const weeklyBadgeAwards = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Running weekly badge awards check');

    // Check and award badges for all eligible users
    const users = await getUsersCloseToEarning();
    for (const user of users) {
      await checkAndAwardBadges(user.id);
    }

    await logAutomation({
      service: 'automation_worker',
      action: 'weekly_badge_awards',
      status: 'success',
      details: { message: 'Badge awards check completed', usersChecked: users.length },
    });

    logger.info('Weekly badge awards check completed');
  } catch (error: any) {
    logger.error('Weekly badge awards check failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'weekly_badge_awards',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Email queue processing
 * Runs every 5 minutes
 */
const processEmailQueue = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Processing email queue');
    const result = await processQueue();

    logger.info('Email queue processed', result);

    await logAutomation({
      service: 'automation_worker',
      action: 'process_email_queue',
      status: 'success',
      details: result,
    });
  } catch (error: any) {
    logger.error('Email queue processing failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'process_email_queue',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Retry failed emails
 * Runs every 6 hours
 */
const retryFailedEmailsJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Retrying failed emails');
    const count = await retryFailedEmails();

    logger.info(`Retried ${count} failed emails`);

    await logAutomation({
      service: 'automation_worker',
      action: 'retry_failed_emails',
      status: 'success',
      details: { count },
    });
  } catch (error: any) {
    logger.error('Failed email retry job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'retry_failed_emails',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Send subscription expiring reminders
 * Runs daily at 9 AM
 */
const subscriptionRemindersJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Sending subscription expiring reminders');
    const count = await sendSubscriptionExpiringReminders();

    logger.info(`Sent ${count} subscription reminders`);

    await logAutomation({
      service: 'automation_worker',
      action: 'subscription_expiring_reminders',
      status: 'success',
      details: { count },
    });
  } catch (error: any) {
    logger.error('Subscription reminders job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'subscription_expiring_reminders',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Send re-engagement emails
 * Runs daily at 2 PM
 */
const reengagementEmailsJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Sending re-engagement emails');
    const count = await sendReengagementEmails();

    logger.info(`Sent ${count} re-engagement emails`);

    await logAutomation({
      service: 'automation_worker',
      action: 'reengagement_emails',
      status: 'success',
      details: { count },
    });
  } catch (error: any) {
    logger.error('Re-engagement emails job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'reengagement_emails',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Clean old queue items
 * Runs weekly on Sunday at 4 AM
 */
const cleanOldQueueJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Cleaning old queue items');
    const count = await cleanOldQueue(30);

    logger.info(`Cleaned ${count} old queue items`);

    await logAutomation({
      service: 'automation_worker',
      action: 'clean_old_queue',
      status: 'success',
      details: { count },
    });
  } catch (error: any) {
    logger.error('Clean old queue job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'clean_old_queue',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

// ============================================
// SOCIAL MEDIA AUTOMATION JOBS
// ============================================

/**
 * Twitter posting jobs (4x daily: 8am, 12pm, 4pm, 8pm EST)
 */
const scheduleDailyTweet = async (): Promise<void> => {
  try {
    logger.info('Scheduling daily tweet');
    const postId = await scheduleTweet();

    if (postId) {
      logger.info(`Tweet scheduled successfully: ${postId}`);
      
      await logAutomation({
        service: 'automation_worker',
        action: 'schedule_daily_tweet',
        status: 'success',
        details: { postId },
      });
    } else {
      throw new Error('Failed to schedule tweet');
    }
  } catch (error: any) {
    logger.error('Schedule daily tweet job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'schedule_daily_tweet',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Process pending tweets (every 5 minutes)
 */
const processTweetsJob = async (): Promise<void> => {
  try {
    await processPendingTweets();

    await logAutomation({
      service: 'automation_worker',
      action: 'process_tweets',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Process tweets job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'process_tweets',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Instagram story posting jobs (6x daily: 8am, 10am, 12pm, 3pm, 6pm, 9pm EST)
 */
const scheduleInstagramStoryJob = async (): Promise<void> => {
  try {
    logger.info('Scheduling Instagram story');
    const postId = await scheduleInstagramStory();

    if (postId) {
      logger.info(`Instagram story scheduled successfully: ${postId}`);
      
      await logAutomation({
        service: 'automation_worker',
        action: 'schedule_instagram_story',
        status: 'success',
        details: { postId },
      });
    } else {
      throw new Error('Failed to schedule Instagram story');
    }
  } catch (error: any) {
    logger.error('Schedule Instagram story job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'schedule_instagram_story',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Process pending Instagram stories (every 10 minutes)
 */
const processInstagramStoriesJob = async (): Promise<void> => {
  try {
    await processPendingInstagramStories();

    await logAutomation({
      service: 'automation_worker',
      action: 'process_instagram_stories',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Process Instagram stories job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'process_instagram_stories',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Reddit posting jobs (2x weekly: Monday & Thursday at 3pm EST)
 */
const scheduleRedditPostJob = async (): Promise<void> => {
  try {
    logger.info('Scheduling Reddit post');
    const subreddit = getRandomSubreddit();
    const postId = await scheduleRedditPost(subreddit);

    if (postId) {
      logger.info(`Reddit post scheduled successfully: ${postId} to r/${subreddit}`);
      
      await logAutomation({
        service: 'automation_worker',
        action: 'schedule_reddit_post',
        status: 'success',
        details: { postId, subreddit },
      });
    } else {
      throw new Error('Failed to schedule Reddit post');
    }
  } catch (error: any) {
    logger.error('Schedule Reddit post job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'schedule_reddit_post',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Process pending Reddit posts (every 15 minutes)
 */
const processRedditPostsJob = async (): Promise<void> => {
  try {
    await processPendingRedditPosts();

    await logAutomation({
      service: 'automation_worker',
      action: 'process_reddit_posts',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Process Reddit posts job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'process_reddit_posts',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

// ============================================
// BADGE & GAMIFICATION JOBS
// ============================================

/**
 * Check if users earned new badges (every 5 minutes)
 */
const checkBadgeEarnings = async (): Promise<void> => {
  try {
    await batchUpdateAllProgress();

    await logAutomation({
      service: 'automation_worker',
      action: 'check_badge_earnings',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Check badge earnings job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'check_badge_earnings',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Update leaderboards (every 15 minutes)
 */
const updateLeaderboardsJob = async (): Promise<void> => {
  try {
    await calculateAllLeaderboards();

    await logAutomation({
      service: 'automation_worker',
      action: 'update_leaderboards',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Update leaderboards job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'update_leaderboards',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Calculate weekly leaderboards (daily at 1 AM, resets Monday)
 */
const calculateWeeklyLeaderboards = async (): Promise<void> => {
  try {
    logger.info('Calculating weekly leaderboards');
    await calculateAllLeaderboards();

    await logAutomation({
      service: 'automation_worker',
      action: 'calculate_weekly_leaderboards',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Calculate weekly leaderboards job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'calculate_weekly_leaderboards',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Calculate monthly leaderboards (daily at 2 AM, resets 1st of month)
 */
const calculateMonthlyLeaderboards = async (): Promise<void> => {
  try {
    logger.info('Calculating monthly leaderboards');
    await calculateAllLeaderboards();

    await logAutomation({
      service: 'automation_worker',
      action: 'calculate_monthly_leaderboards',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Calculate monthly leaderboards job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'calculate_monthly_leaderboards',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Notify users close to earning badges (daily at 9 AM)
 */
const notifyUsersCloseToEarning = async (): Promise<void> => {
  try {
    logger.info('Notifying users close to earning badges');

    // Get all badges
    const badges = await getAllBadges();

    for (const badge of badges) {
      // Find users at 80%+ progress
      const usersClose = await getUsersCloseToEarning(badge.id, 80);

      logger.info(`Found ${usersClose.length} users close to earning ${badge.display_name}`);

      // TODO: Send notifications to these users
      // For now, just log
      for (const userProgress of usersClose) {
        logger.debug(`User ${userProgress.userId} is ${userProgress.percentage}% to ${badge.display_name}`);
      }
    }

    await logAutomation({
      service: 'automation_worker',
      action: 'notify_users_close_to_earning',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Notify users close to earning job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'notify_users_close_to_earning',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Clean expired streak freezes (daily at 3 AM)
 */
const cleanStreakFreezesJob = async (): Promise<void> => {
  try {
    await cleanExpiredFreezes();

    await logAutomation({
      service: 'automation_worker',
      action: 'clean_streak_freezes',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Clean streak freezes job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'clean_streak_freezes',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Archive old leaderboards (weekly on Sunday at 5 AM)
 */
const archiveLeaderboardsJob = async (): Promise<void> => {
  try {
    await archiveOldLeaderboards();

    await logAutomation({
      service: 'automation_worker',
      action: 'archive_leaderboards',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Archive leaderboards job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'archive_leaderboards',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

// ============================================
// ANALYTICS & REPORTING JOBS (PHASE 5)
// ============================================

/**
 * Clear expired dashboard cache (hourly at :00)
 */
const clearDashboardCacheJob = async (): Promise<void> => {
  try {
    await clearExpiredCache();

    await logAutomation({
      service: 'automation_worker',
      action: 'clear_dashboard_cache',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Clear dashboard cache job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'clear_dashboard_cache',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Create daily analytics snapshot (daily at 11:59 PM)
 */
const dailySnapshotJob = async (): Promise<void> => {
  try {
    logger.info('Creating daily analytics snapshot');
    await createDailySnapshot();

    logger.info('Daily analytics snapshot created');

    await logAutomation({
      service: 'automation_worker',
      action: 'daily_analytics_snapshot',
      status: 'success',
    });
  } catch (error: any) {
    logger.error('Daily analytics snapshot job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'daily_analytics_snapshot',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Generate and send daily analytics report (daily at 8 AM)
 */
const dailyReportJob = async (): Promise<void> => {
  try {
    logger.info('Generating daily analytics report');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@trollz1004.com';
    const report = await generateDailyReport(adminEmail); // Send email

    logger.info('Daily analytics report generated and sent');

    await logAutomation({
      service: 'automation_worker',
      action: 'daily_analytics_report',
      status: 'success',
      details: { reportDate: report.date },
    });
  } catch (error: any) {
    logger.error('Daily analytics report job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'daily_analytics_report',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Generate and send weekly analytics report (Monday at 9 AM)
 */
const weeklyReportJob = async (): Promise<void> => {
  try {
    logger.info('Generating weekly analytics report');
    const report = await generateWeeklyReport();

    logger.info('Weekly analytics report generated and sent');

    await logAutomation({
      service: 'automation_worker',
      action: 'weekly_analytics_report',
      status: 'success',
      details: { weekEnding: report.weekEnding },
    });
  } catch (error: any) {
    logger.error('Weekly analytics report job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'weekly_analytics_report',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Generate and send monthly analytics report (1st of month at 9 AM)
 */
const monthlyReportJob = async (): Promise<void> => {
  try {
    logger.info('Generating monthly analytics report');
    const report = await generateMonthlyReport();

    logger.info('Monthly analytics report generated and sent');

    await logAutomation({
      service: 'automation_worker',
      action: 'monthly_analytics_report',
      status: 'success',
      details: { month: report.month },
    });
  } catch (error: any) {
    logger.error('Monthly analytics report job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'monthly_analytics_report',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Update cohort retention analysis (every 4 weeks on Sunday at 6 AM)
 */
const cohortAnalysisJob = async (): Promise<void> => {
  try {
    logger.info('Updating cohort retention analysis');
    
    // Get cohort analysis for all active cohorts
    const cohortAnalysis = await getCohortRetentionAnalysis();

    logger.info(`Updated cohort analysis: ${cohortAnalysis.length} cohorts`);

    await logAutomation({
      service: 'automation_worker',
      action: 'cohort_retention_analysis',
      status: 'success',
      details: { 
        cohortsProcessed: cohortAnalysis.length,
      },
    });
  } catch (error: any) {
    logger.error('Cohort retention analysis job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'cohort_retention_analysis',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Process SMS queue (every 1 minute)
 */
const processSMSQueueJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Processing SMS queue');
    const result = await processSMSQueue();

    logger.info('SMS queue processed', result);

    await logAutomation({
      service: 'automation_worker',
      action: 'process_sms_queue',
      status: 'success',
      details: result,
    });
  } catch (error: any) {
    logger.error('SMS queue processing failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'process_sms_queue',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Retry failed SMS (every 5 minutes)
 */
const retryFailedSMSJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Retrying failed SMS');
    const result = await retryFailedSMS();

    logger.info(`Retried ${result.retried} failed SMS`);

    await logAutomation({
      service: 'automation_worker',
      action: 'retry_failed_sms',
      status: 'success',
      details: result,
    });
  } catch (error: any) {
    logger.error('Failed SMS retry job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'retry_failed_sms',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Send subscription expiring SMS reminders (daily at 10 AM)
 */
const smsSubscriptionRemindersJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Sending SMS subscription expiring reminders');
    const result = await sendSubscriptionReminders();

    logger.info(`Sent ${result.sent} subscription expiring reminders`);

    await logAutomation({
      service: 'automation_worker',
      action: 'sms_subscription_reminders',
      status: 'success',
      details: result,
    });
  } catch (error: any) {
    logger.error('SMS subscription reminders job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'sms_subscription_reminders',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Send daily match SMS notifications (daily at 9 AM)
 */
const smsDailyMatchNotificationsJob = async (): Promise<void> => {
  if (isShuttingDown) return;

  try {
    logger.info('Sending daily match SMS notifications');
    const result = await sendDailyMatchNotifications();

    logger.info(`Sent ${result.sent} daily match notifications`);

    await logAutomation({
      service: 'automation_worker',
      action: 'sms_daily_match_notifications',
      status: 'success',
      details: result,
    });
  } catch (error: any) {
    logger.error('Daily match SMS notifications job failed', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'sms_daily_match_notifications',
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

/**
 * Schedule cron jobs
 * Checks every minute if any scheduled task should run based on current time
 */
const scheduleCronJobs = (): void => {
  const interval = setInterval(() => {
    if (isShuttingDown) {
      clearInterval(interval);
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // REFERRAL SYSTEM JOBS
    // Daily job at 2:00 AM - Deactivate expired codes
    if (hour === 2 && minute === 0) {
      dailyExpiredCodesCleanup();
    }

    // Weekly job on Sunday at 3:00 AM - Award badges
    if (dayOfWeek === 0 && hour === 3 && minute === 0) {
      weeklyBadgeAwards();
    }

    // EMAIL SYSTEM JOBS
    // Every 5 minutes - Process email queue
    if (minute % 5 === 0) {
      processEmailQueue();
    }

    // Every 6 hours - Retry failed emails (0, 6, 12, 18)
    if ([0, 6, 12, 18].includes(hour) && minute === 0) {
      retryFailedEmailsJob();
    }

    // Daily at 9 AM - Send subscription expiring reminders
    if (hour === 9 && minute === 0) {
      subscriptionRemindersJob();
    }

    // Daily at 2 PM - Send re-engagement emails
    if (hour === 14 && minute === 0) {
      reengagementEmailsJob();
    }

    // Weekly on Sunday at 4 AM - Clean old queue
    if (dayOfWeek === 0 && hour === 4 && minute === 0) {
      cleanOldQueueJob();
    }

    // SOCIAL MEDIA AUTOMATION JOBS
    // Twitter - 4x daily at 8am, 12pm, 4pm, 8pm EST
    if ([8, 12, 16, 20].includes(hour) && minute === 0) {
      scheduleDailyTweet();
    }

    // Process pending tweets every 5 minutes
    if (minute % 5 === 0) {
      processTweetsJob();
    }

    // Instagram Stories - 6x daily at 8am, 10am, 12pm, 3pm, 6pm, 9pm EST
    if ([8, 10, 12, 15, 18, 21].includes(hour) && minute === 0) {
      scheduleInstagramStoryJob();
    }

    // Process pending Instagram stories every 10 minutes
    if (minute % 10 === 0) {
      processInstagramStoriesJob();
    }

    // Reddit - 2x weekly: Monday (1) & Thursday (4) at 3pm EST
    if ([1, 4].includes(dayOfWeek) && hour === 15 && minute === 0) {
      scheduleRedditPostJob();
    }

    // Process pending Reddit posts every 15 minutes
    if (minute % 15 === 0) {
      processRedditPostsJob();
    }

    // BADGE & GAMIFICATION JOBS
    // Every 5 minutes - Check if users earned new badges
    if (minute % 5 === 0) {
      checkBadgeEarnings();
    }

    // Every 15 minutes - Update leaderboards
    if (minute % 15 === 0) {
      updateLeaderboardsJob();
    }

    // Daily at 1 AM - Calculate weekly leaderboards
    if (hour === 1 && minute === 0) {
      calculateWeeklyLeaderboards();
    }

    // Daily at 2 AM - Calculate monthly leaderboards
    if (hour === 2 && minute === 30) {
      calculateMonthlyLeaderboards();
    }

    // Daily at 9 AM - Notify users close to earning badges
    if (hour === 9 && minute === 0) {
      notifyUsersCloseToEarning();
    }

    // Daily at 3 AM - Clean expired streak freezes
    if (hour === 3 && minute === 0) {
      cleanStreakFreezesJob();
    }

    // Weekly on Sunday at 5 AM - Archive old leaderboards
    if (dayOfWeek === 0 && hour === 5 && minute === 0) {
      archiveLeaderboardsJob();
    }

    // ANALYTICS & REPORTING JOBS (PHASE 5)
    // Hourly at :00 - Clear expired dashboard cache
    if (minute === 0) {
      clearDashboardCacheJob();
    }

    // Daily at 11:59 PM - Create daily analytics snapshot
    if (hour === 23 && minute === 59) {
      dailySnapshotJob();
    }

    // Daily at 8 AM - Generate and send daily analytics report
    if (hour === 8 && minute === 0) {
      dailyReportJob();
    }

    // Weekly on Monday at 9 AM - Generate and send weekly analytics report
    if (dayOfWeek === 1 && hour === 9 && minute === 0) {
      weeklyReportJob();
    }

    // Monthly on 1st at 9 AM - Generate and send monthly analytics report
    const dayOfMonth = now.getDate();
    if (dayOfMonth === 1 && hour === 9 && minute === 0) {
      monthlyReportJob();
    }

    // Every 4 weeks on Sunday at 6 AM - Update cohort retention analysis
    // Calculate week number (rough estimate for 4-week intervals)
    const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    if (dayOfWeek === 0 && hour === 6 && minute === 0 && weekNumber % 4 === 0) {
      cohortAnalysisJob();
    }

    // SMS AUTOMATION JOBS (PHASE 7)
    // Every 1 minute - Process SMS queue
    processSMSQueueJob();

    // Every 5 minutes - Retry failed SMS
    if (minute % 5 === 0) {
      retryFailedSMSJob();
    }

    // Daily at 10 AM - Send subscription expiring SMS reminders
    if (hour === 10 && minute === 0) {
      smsSubscriptionRemindersJob();
    }

    // Daily at 9 AM - Send daily match SMS notifications
    if (hour === 9 && minute === 0) {
      smsDailyMatchNotificationsJob();
    }
  }, CRON_CHECK_INTERVAL_MS);

  activeIntervals.push(interval);
};

/**
 * Health check job
 * Runs every 5 minutes to ensure worker is alive
 */
const healthCheck = (): void => {
  const interval = setInterval(async () => {
    if (isShuttingDown) {
      clearInterval(interval);
      return;
    }

    try {
      await logAutomation({
        service: 'automation_worker',
        action: 'health_check',
        status: 'success',
        details: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      });

      logger.debug('Automation worker health check passed');
    } catch (error: any) {
      logger.error('Automation worker health check failed', { error: error.message });
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  activeIntervals.push(interval);
};

/**
 * Graceful shutdown handler
 * Clears all intervals and waits for pending operations
 */
const gracefulShutdown = async (): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info('Automation worker shutting down gracefully...');

  // Clear all intervals
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals.length = 0;

  // Log shutdown
  await logAutomation({
    service: 'automation_worker',
    action: 'shutdown',
    status: 'success',
    details: { timestamp: new Date().toISOString() },
  });

  logger.info('Automation worker shutdown complete');
};

/**
 * Start the automation worker
 * Initializes cron jobs and health checks
 * 
 * @returns Promise that resolves when worker is initialized
 */
export const startAutomationWorker = async (): Promise<void> => {
  if (!ENABLE_AUTOMATION_WORKER) {
    logger.info('Automation worker is disabled via environment variable');
    return;
  }

  try {
    logger.info('Starting automation worker...');

    // Register shutdown handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start cron jobs
    scheduleCronJobs();

    // Start health check
    healthCheck();

    // Log startup
    await logAutomation({
      service: 'automation_worker',
      action: 'startup',
      status: 'success',
      details: {
        timestamp: new Date().toISOString(),
        enabled: ENABLE_AUTOMATION_WORKER,
      },
    });

    logger.info('✅ Automation worker started successfully');
    logger.info('📅 Scheduled jobs:');
    logger.info('  REFERRAL SYSTEM:');
    logger.info('    - Daily: Expired codes cleanup (2:00 AM)');
    logger.info('    - Weekly: Badge awards check (Sunday 3:00 AM)');
    logger.info('  EMAIL SYSTEM:');
    logger.info('    - Every 5 minutes: Process email queue');
    logger.info('    - Every 6 hours: Retry failed emails');
    logger.info('    - Daily: Subscription expiring reminders (9:00 AM)');
    logger.info('    - Daily: Re-engagement emails (2:00 PM)');
    logger.info('    - Weekly: Clean old queue (Sunday 4:00 AM)');
    logger.info('  SOCIAL MEDIA:');
    logger.info('    - Twitter: 4x daily (8am, 12pm, 4pm, 8pm)');
    logger.info('    - Instagram: 6x daily (8am, 10am, 12pm, 3pm, 6pm, 9pm)');
    logger.info('    - Reddit: 2x weekly (Monday & Thursday 3pm)');
    logger.info('  BADGES & GAMIFICATION:');
    logger.info('    - Every 5 minutes: Check badge earnings');
    logger.info('    - Every 15 minutes: Update leaderboards');
    logger.info('    - Daily: Weekly leaderboards (1:00 AM)');
    logger.info('    - Daily: Monthly leaderboards (2:30 AM)');
    logger.info('    - Daily: Notify users close to badges (9:00 AM)');
    logger.info('    - Daily: Clean expired streak freezes (3:00 AM)');
    logger.info('    - Weekly: Archive old leaderboards (Sunday 5:00 AM)');
    logger.info('  ANALYTICS & REPORTING:');
    logger.info('    - Hourly: Clear dashboard cache (:00)');
    logger.info('    - Daily: Analytics snapshot (11:59 PM)');
    logger.info('    - Daily: Daily report (8:00 AM)');
    logger.info('    - Weekly: Weekly report (Monday 9:00 AM)');
    logger.info('    - Monthly: Monthly report (1st 9:00 AM)');
    logger.info('    - Every 4 weeks: Cohort analysis (Sunday 6:00 AM)');
    logger.info('  SMS AUTOMATION:');
    logger.info('    - Every 1 minute: Process SMS queue');
    logger.info('    - Every 5 minutes: Retry failed SMS');
    logger.info('    - Daily: Subscription expiring SMS (10:00 AM)');
    logger.info('    - Daily: Daily match SMS notifications (9:00 AM)');
    logger.info('  MONITORING:');
    logger.info('    - Health check: Every 5 minutes');
  } catch (error: any) {
    logger.error('Failed to start automation worker', { error: error.message });

    await logAutomation({
      service: 'automation_worker',
      action: 'startup',
      status: 'failed',
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * Stop the automation worker
 * Alias for gracefulShutdown for external calls
 */
export const stopAutomationWorker = gracefulShutdown;
