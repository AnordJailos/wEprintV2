/** Orders, their lines and their timeline. */
import type { PoolClient } from "pg";

import { count, one, query } from "@/db/pool";
import type {
  OrderItemRow,
  OrderRow,
  OrderStatus,
  OrderStatusHistoryRow,
  PaymentStatus,
} from "@/entities/types";

export type OrderWithCustomer = OrderRow & { customer_name: string };

export const OrderRepository = {
  /**
   * The admin sees every order; a customer sees only their own. That is enforced
   * by `userId` being non-null for customers — the caller cannot forget, because
   * the use case always passes it.
   */
  async list(params: { userId: number | null; status?: string; limit: number; offset: number }) {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.userId !== null) {
      values.push(params.userId);
      where.push(`o.user_id = $${values.length}`);
    }
    if (params.status && params.status !== "all") {
      values.push(params.status);
      where.push(`o.status = $${values.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const total = await count(`SELECT COUNT(*)::text AS count FROM orders o ${clause}`, values);
    const rows = await query<OrderWithCustomer>(
      `SELECT o.*, u.name AS customer_name
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ${clause}
        ORDER BY o.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, params.offset],
    );
    return { rows, total };
  },

  find(id: number) {
    return one<OrderWithCustomer>(
      `SELECT o.*, u.name AS customer_name
         FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [id],
    );
  },

  items(orderId: number) {
    return query<OrderItemRow>("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC", [
      orderId,
    ]);
  },

  itemsFor(orderIds: number[]) {
    if (orderIds.length === 0) return Promise.resolve([] as OrderItemRow[]);
    return query<OrderItemRow>(
      "SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id ASC",
      [orderIds],
    );
  },

  history(orderId: number) {
    return query<OrderStatusHistoryRow>(
      "SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC, id ASC",
      [orderId],
    );
  },

  /** Called inside a transaction by the use case; see `createWithItems`. */
  async insertInTx(
    client: PoolClient,
    data: {
      reference: string;
      user_id: number;
      design_id: number | null;
      total: number;
      notes: string | null;
    },
  ) {
    const res = await client.query<OrderRow>(
      `INSERT INTO orders (reference, user_id, design_id, status, payment_status, total, notes)
       VALUES ($1, $2, $3, 'pending', 'unpaid', $4, $5)
       RETURNING *`,
      [data.reference, data.user_id, data.design_id, data.total, data.notes],
    );
    return res.rows[0]!;
  },

  async insertItemInTx(
    client: PoolClient,
    data: {
      order_id: number;
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      options: Record<string, string>;
    },
  ) {
    const res = await client.query<OrderItemRow>(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, options)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        data.order_id,
        data.product_id,
        data.product_name,
        data.quantity,
        data.unit_price,
        JSON.stringify(data.options ?? {}),
      ],
    );
    return res.rows[0]!;
  },

  async insertHistoryInTx(
    client: PoolClient,
    data: { order_id: number; status: OrderStatus; note: string | null; changed_by: number | null },
  ) {
    await client.query(
      `INSERT INTO order_status_history (order_id, status, note, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [data.order_id, data.status, data.note, data.changed_by],
    );
  },

  updateStatus(id: number, status: OrderStatus) {
    return one<OrderRow>(
      "UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id, status],
    );
  },

  updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
    return one<OrderRow>(
      "UPDATE orders SET payment_status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id, paymentStatus],
    );
  },

  insertHistory(data: {
    order_id: number;
    status: OrderStatus;
    note: string | null;
    changed_by: number | null;
  }) {
    return query(
      `INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1, $2, $3, $4)`,
      [data.order_id, data.status, data.note, data.changed_by],
    );
  },

  /** Highest reference number today, used to build AK-YYMMDD-### references. */
  async lastReferenceToday(prefix: string) {
    const row = await one<{ reference: string }>(
      "SELECT reference FROM orders WHERE reference LIKE $1 ORDER BY reference DESC LIMIT 1",
      [`${prefix}%`],
    );
    return row?.reference ?? null;
  },
};
