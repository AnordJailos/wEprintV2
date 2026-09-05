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

    return {
      orders_today: ordersToday,
      revenue_this_month: revenueMonth,
      open_orders: openOrders,
      average_turnaround_days: turnaround,
      orders_by_status: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      revenue_trend: trend.map((r) => ({ label: r.label, value: Number(r.value) })),
      assistant_online: aiUp,
    };
  },
};
