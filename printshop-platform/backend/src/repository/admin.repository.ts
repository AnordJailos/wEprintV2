/** Aggregates for the owner dashboard. All arithmetic happens in Postgres. */
import { one, query } from '@/db/pool';
import type { OrderStatus } from '@/entities/types';

export const AdminRepository = {
  async ordersToday() {
    const row = await one<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders WHERE created_at >= DATE_TRUNC('day', NOW())`,
    );
    return Number(row?.count ?? 0);
  },

  async revenueThisMonth() {
    const row = await one<{ total: string | null }>(
      `SELECT COALESCE(SUM(total), 0)::text AS total
         FROM orders
        WHERE created_at >= DATE_TRUNC('month', NOW())
          AND status <> 'cancelled'`,
    );
    return Number(row?.total ?? 0);
  },

  async openOrders() {
    const row = await one<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders WHERE status NOT IN ('delivered', 'cancelled')`,
    );
    return Number(row?.count ?? 0);
  },

  /** Average days from creation to the first 'delivered' timeline entry. */
  async averageTurnaroundDays() {
    const row = await one<{ days: string | null }>(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (h.changed_at - o.created_at)) / 86400)::numeric, 1)::text AS days
         FROM orders o
         JOIN order_status_history h ON h.order_id = o.id AND h.status = 'delivered'
        WHERE o.created_at >= NOW() - INTERVAL '90 days'`,
    );
    return row?.days ? Number(row.days) : 0;
  },

  byStatus() {
    return query<{ status: OrderStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM orders GROUP BY status ORDER BY status`,
    );
  },

  /** Six calendar months of revenue, oldest first, gaps filled with zero. */
  revenueTrend() {
    return query<{ label: string; value: string }>(
      `WITH months AS (
         SELECT DATE_TRUNC('month', NOW()) - (n || ' month')::interval AS m
           FROM generate_series(5, 0, -1) AS n
       )
       SELECT TO_CHAR(months.m, 'Mon') AS label,
              COALESCE(SUM(o.total), 0)::text AS value
         FROM months
    LEFT JOIN orders o
           ON DATE_TRUNC('month', o.created_at) = months.m
          AND o.status <> 'cancelled'
        GROUP BY months.m
        ORDER BY months.m ASC`,
    );
  },
};
