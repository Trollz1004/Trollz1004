import { query } from './db';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  premium_tier: string;
}

export const getRecentUsers = async (limit: number = 10): Promise<User[]> => {
  const { rows } = await query('SELECT id, name, email, created_at, premium_tier FROM users ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
};

export const getUserGrowth = async () => {
    const { rows } = await query(`
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as count
        FROM users
        GROUP BY date
        ORDER BY date ASC
    `, []);
    return rows;
}