/** The owner dashboard. Read-only aggregates, computed in Postgres. */
import { AiClient } from '@/ai/client';
import { AdminRepository } from '@/repository/admin.repository';

export const AdminUseCase = {
  async dashboard() {
    const [ordersToday, revenueMonth, openOrders, turnaround, byStatus, trend, aiUp] = await Promise.all([
      AdminRepository.ordersToday(),
      AdminRepository.revenueThisMonth(),
      AdminRepository.openOrders(),
      AdminRepository.averageTurnaroundDays(),
      AdminRepository.byStatus(),
      AdminRepository.revenueTrend(),
      AiClient.health(),
    ]);

    const byStatusOut = byStatus.map((r) => ({ status: r.status, count: Number(r.count) }));
    const trendOut = trend.map((r) => ({ label: r.label, value: Number(r.value) }));

    // The field names the frontend consumes are the contract (see
    // src/lib/demo-data.ts -> DashboardMetrics). The longer names are kept as
    // aliases so nothing that already reads them breaks.
    return {
      orders_today: Number(ordersToday),
      revenue_month: Number(revenueMonth),
      revenue_this_month: Number(revenueMonth),
      open_orders: Number(openOrders),
      avg_turnaround_days: Number(turnaround),
      average_turnaround_days: Number(turnaround),
      by_status: byStatusOut,
      orders_by_status: byStatusOut,
      revenue_trend: trendOut,
      assistant_online: aiUp,
    };

  },
};
