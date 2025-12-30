import db from '../models/database.js';
import logger from '../utils/logger.js';

export class RevenueService {
  static async updateRevenueCache() {
    try {
      const now = Math.floor(Date.now() / 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Math.floor(today.getTime() / 1000);
      const todayEnd = todayStart + 86400;

      // Today's revenue
      const todayData = await db.get(
        `SELECT 
          SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue,
          COUNT(*) as total_orders,
          SUM(CASE WHEN p.review_status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN p.review_status = 'declined' THEN 1 ELSE 0 END) as declined
         FROM payments p
         WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
        [todayStart, todayEnd]
      );

      await this.upsertCache('day', todayStart, todayEnd, todayData);

      // This month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthStartTs = Math.floor(monthStart.getTime() / 1000);
      const monthEndTs = Math.floor(monthEnd.getTime() / 1000);

      const monthData = await db.get(
        `SELECT 
          SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue,
          COUNT(*) as total_orders,
          SUM(CASE WHEN p.review_status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN p.review_status = 'declined' THEN 1 ELSE 0 END) as declined
         FROM payments p
         WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
        [monthStartTs, monthEndTs]
      );

      await this.upsertCache('month', monthStartTs, monthEndTs, monthData);

      logger.info('Revenue cache updated');
    } catch (error) {
      logger.error(`Update revenue cache error: ${error.message}`);
    }
  }

  static async upsertCache(periodType, periodStart, periodEnd, data) {
    const revenue = data?.revenue || 0;
    const totalOrders = data?.total_orders || 0;
    const approved = data?.approved || 0;
    const declined = data?.declined || 0;

    await db.run(
      `INSERT INTO revenue_cache (period_type, period_start, period_end, total_revenue, total_orders, approved_orders, declined_orders)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(period_type, period_start, period_end) DO UPDATE SET
       total_revenue = ?, total_orders = ?, approved_orders = ?, declined_orders = ?, last_updated = strftime('%s', 'now')`,
      [periodType, periodStart, periodEnd, revenue, totalOrders, approved, declined, revenue, totalOrders, approved, declined]
    );
  }

  static async getDashboardData() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Math.floor(today.getTime() / 1000);
      const todayEnd = todayStart + 86400;

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthStartTs = Math.floor(monthStart.getTime() / 1000);
      const monthEndTs = Math.floor(monthEnd.getTime() / 1000);

      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 1);
      const quarterStartTs = Math.floor(quarterStart.getTime() / 1000);
      const quarterEndTs = Math.floor(quarterEnd.getTime() / 1000);

      const yearStart = new Date(today.getFullYear(), 0, 1);
      const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
      const yearStartTs = Math.floor(yearStart.getTime() / 1000);
      const yearEndTs = Math.floor(yearEnd.getTime() / 1000);

      const [todayData, monthData, quarterData, yearData, totalStats] = await Promise.all([
        db.get(
          `SELECT SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue, COUNT(*) as orders
           FROM payments p WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
          [todayStart, todayEnd]
        ),
        db.get(
          `SELECT SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue, COUNT(*) as orders
           FROM payments p WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
          [monthStartTs, monthEndTs]
        ),
        db.get(
          `SELECT SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue, COUNT(*) as orders
           FROM payments p WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
          [quarterStartTs, quarterEndTs]
        ),
        db.get(
          `SELECT SUM(CASE WHEN p.review_status = 'approved' THEN p.amount ELSE 0 END) as revenue, COUNT(*) as orders
           FROM payments p WHERE p.submitted_at >= ? AND p.submitted_at < ?`,
          [yearStartTs, yearEndTs]
        ),
        db.get(
          `SELECT COUNT(*) as total_orders,
                  SUM(CASE WHEN p.review_status = 'approved' THEN 1 ELSE 0 END) as approved,
                  SUM(CASE WHEN p.review_status = 'declined' THEN 1 ELSE 0 END) as declined
           FROM payments p`
        )
      ]);

      return {
        today: { revenue: todayData?.revenue || 0, orders: todayData?.orders || 0 },
        month: { revenue: monthData?.revenue || 0, orders: monthData?.orders || 0 },
        quarter: { revenue: quarterData?.revenue || 0, orders: quarterData?.orders || 0 },
        year: { revenue: yearData?.revenue || 0, orders: yearData?.orders || 0 },
        total: {
          orders: totalStats?.total_orders || 0,
          approved: totalStats?.approved || 0,
          declined: totalStats?.declined || 0
        }
      };
    } catch (error) {
      logger.error(`Get dashboard data error: ${error.message}`);
      return null;
    }
  }
}

export default RevenueService;
