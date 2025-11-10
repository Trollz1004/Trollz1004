import pool from '../database';
import logger from '../logger';

interface SecurityEventParams {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityEventRecord {
  id: string;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export const logSecurityEvent = async ({
  userId,
  eventType,
  ipAddress,
  userAgent,
  metadata,
}: SecurityEventParams): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, event_type, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, eventType, ipAddress ?? null, userAgent ?? null, metadata ?? null]
    );
  } catch (error: any) {
    logger.error('Failed to log security event', {
      error: error.message,
      eventType,
      userId,
    });
  }
};

export const getSecurityEventsForUser = async (
  userId: string,
  limit: number,
  before?: Date
): Promise<SecurityEventRecord[]> => {
  const params: any[] = [userId];
  let whereClause = 'user_id = $1';

  if (before) {
    params.push(before);
    whereClause += ` AND created_at < $${params.length}`;
  }

  params.push(limit);

  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, ip_address, user_agent, metadata, created_at
       FROM security_events
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return rows.map((row: {
      id: string;
      event_type: string;
      ip_address: string | null;
      user_agent: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }) => ({
      id: row.id,
      eventType: row.event_type,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  } catch (error: any) {
    logger.error('Failed to fetch security events', {
      error: error.message,
      userId,
    });
    return [];
  }
};
