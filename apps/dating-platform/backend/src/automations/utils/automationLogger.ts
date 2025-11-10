import pool from '../../database';
import logger from '../../logger';

/**
 * Parameters for logging automation events
 */
interface AutomationLogParams {
  service: string;
  action: string;
  status: 'success' | 'failed' | 'pending';
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Log an automation event to the automation_logs table
 * Provides centralized logging for all automation services
 * 
 * @param params - Automation log parameters
 */
export const logAutomation = async (params: AutomationLogParams): Promise<void> => {
  const { service, action, status, details, errorMessage } = params;

  try {
    await pool.query(
      `INSERT INTO automation_logs (service, action, status, details, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [service, action, status, details ? JSON.stringify(details) : null, errorMessage || null]
    );
  } catch (error: any) {
    // Don't throw on logging failure - just log to Winston
    logger.error('Failed to write automation log', {
      error: error.message,
      service,
      action,
      status,
    });
  }
};

/**
 * Get recent automation logs for a specific service
 * 
 * @param service - Service name to filter by
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of automation log entries
 */
export const getAutomationLogs = async (
  service?: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  service: string;
  action: string;
  status: string;
  details: Record<string, any> | null;
  errorMessage: string | null;
  createdAt: Date;
}>> => {
  try {
    const query = service
      ? `SELECT id, service, action, status, details, error_message, created_at 
         FROM automation_logs 
         WHERE service = $1 
         ORDER BY created_at DESC 
         LIMIT $2`
      : `SELECT id, service, action, status, details, error_message, created_at 
         FROM automation_logs 
         ORDER BY created_at DESC 
         LIMIT $1`;

    const params = service ? [service, limit] : [limit];
    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      service: row.service,
      action: row.action,
      status: row.status,
      details: row.details,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));
  } catch (error: any) {
    logger.error('Failed to fetch automation logs', {
      error: error.message,
      service,
      limit,
    });
    throw error;
  }
};

/**
 * Get automation statistics for monitoring
 * 
 * @param service - Optional service name to filter by
 * @param hoursAgo - Number of hours to look back (default: 24)
 * @returns Statistics object with success/failure counts
 */
export const getAutomationStats = async (
  service?: string,
  hoursAgo: number = 24
): Promise<{
  totalLogs: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  recentErrors: Array<{ action: string; errorMessage: string; createdAt: Date }>;
}> => {
  try {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursAgo);

    const baseWhere = service
      ? `WHERE service = $1 AND created_at >= $2`
      : `WHERE created_at >= $1`;

    const params = service ? [service, timeThreshold] : [timeThreshold];

    // Get counts by status
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM automation_logs
      ${baseWhere}
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    const totalLogs = parseInt(stats.total, 10);
    const successCount = parseInt(stats.success_count, 10);
    const failedCount = parseInt(stats.failed_count, 10);
    const pendingCount = parseInt(stats.pending_count, 10);

    const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 0;

    // Get recent errors
    const errorsQuery = `
      SELECT action, error_message, created_at
      FROM automation_logs
      ${baseWhere} AND status = 'failed' AND error_message IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const errorsResult = await pool.query(errorsQuery, params);
    const recentErrors = errorsResult.rows.map((row) => ({
      action: row.action,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));

    return {
      totalLogs,
      successCount,
      failedCount,
      pendingCount,
      successRate: parseFloat(successRate.toFixed(2)),
      recentErrors,
    };
  } catch (error: any) {
    logger.error('Failed to get automation stats', {
      error: error.message,
      service,
      hoursAgo,
    });
    throw error;
  }
};
