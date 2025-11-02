import { query } from './db';

export interface ShopItem {
    id: number;
    name: string;
    price: number;
    description: string;
    image_url: string;
}

export const getShopItems = async (): Promise<ShopItem[]> => {
    const { rows } = await query('SELECT * FROM shop_items', []);
    return rows;
}

export const getRevenueBreakdown = async () => {
    const { rows } = await query(`
        SELECT 
            si.name,
            SUM(p.amount) as revenue
        FROM payments p
        JOIN shop_items si ON p.item_id = si.id
        GROUP BY si.name
        ORDER BY revenue DESC
    `, []);
    return rows;
}