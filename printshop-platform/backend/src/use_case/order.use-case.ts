/**
 * Order rules. The important one: prices are never taken from the request.
 *
 * A client sends product ids, quantities and option choices. This file looks the
 * product up, adds the option deltas, and computes the total server-side. A
 * tampered payload cannot buy a banner for one shilling.
 */
import { z } from "zod";

import { ApiError } from "@/core/errors";
import { transaction } from "@/db/pool";
import type { AuthUser } from "@/core/auth";
import {
  orderResponse,
  statusEventResponse,
  type createOrderSchema,
  type updateOrderStatusSchema,
} from "@/api/dto";
import { assertOwnership } from "@/core/auth";
import { money, ORDER_STATUSES, type OrderStatus, type PaymentStatus } from "@/entities/types";
import { DesignRepository } from "@/repository/design.repository";
import { OrderRepository } from "@/repository/order.repository";
import { ProductRepository } from "@/repository/product.repository";

/**
 * Which status may follow which. The owner can cancel from anywhere and can
 * step forward one stage at a time; jumping straight from 'pending' to
 * 'delivered' is rejected so the timeline stays honest.
 */
const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["quality_check", "cancelled"],
  quality_check: ["ready", "in_production", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function referenceFor(last: string | null, prefix: string) {
  const next = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function todayPrefix() {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `AK-${yy}${mm}${dd}-`;
}

export const OrderUseCase = {
  async list(
    user: AuthUser,
    params: { status?: string; page: number; perPage: number; offset: number },
  ) {
    const { rows, total } = await OrderRepository.list({
      userId: user.role === "admin" ? null : user.id,
      status: params.status,
      limit: params.perPage,
      offset: params.offset,
    });
    const items = await OrderRepository.itemsFor(rows.map((r) => r.id));
    const data = rows.map((o) =>
      orderResponse(
        o,
        items.filter((i) => i.order_id === o.id),
      ),
    );
    return { data, page: params.page, per_page: params.perPage, total };
  },

  async get(user: AuthUser, id: number) {
    const order = await OrderRepository.find(id);
    if (!order) throw ApiError.notFound("No such order.");
    assertOwnership(user, order.user_id);
    return orderResponse(order, await OrderRepository.items(id));
  },

  async timeline(user: AuthUser, id: number) {
    const order = await OrderRepository.find(id);
    if (!order) throw ApiError.notFound("No such order.");
    assertOwnership(user, order.user_id);
    return (await OrderRepository.history(id)).map(statusEventResponse);
  },

  /**
   * One transaction: the order row, every item row and the opening timeline
   * entry. If any line fails, nothing is written — no half orders.
   */
  async create(user: AuthUser, input: z.infer<typeof createOrderSchema>) {
    // Resolve products first so validation failures happen before the BEGIN.
    const priced: {
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      options: Record<string, string>;
    }[] = [];

    for (const line of input.items) {
      const product = await ProductRepository.find(line.product_id);
      if (!product || !product.is_available) {
        throw ApiError.badRequest(`Product ${line.product_id} is not available.`);
      }
      const options = await ProductRepository.options(product.id);
      const chosen = line.options ?? {};

      let unit = money(product.base_price);
      for (const [type, value] of Object.entries(chosen)) {
        const match = options.find((o) => o.option_type === type && o.option_value === value);
        if (!match)
          throw ApiError.badRequest(`"${value}" is not a valid ${type} for ${product.name}.`);
        unit += money(match.price_delta);
      }
      if (unit < 0) unit = 0;

      priced.push({
        product_id: product.id,
        product_name: product.name,
        quantity: line.quantity,
        unit_price: Math.round(unit * 100) / 100,
        options: chosen,
      });
    }

    // A customer may only attach their own artwork to their own order.
    if (input.design_id !== undefined) {
      const design = await DesignRepository.find(input.design_id);
      if (!design) throw ApiError.badRequest("That design does not exist.");
      assertOwnership(user, design.user_id);
    }

    const total =
      Math.round(priced.reduce((sum, l) => sum + l.unit_price * l.quantity, 0) * 100) / 100;
    const prefix = todayPrefix();
    const reference = referenceFor(await OrderRepository.lastReferenceToday(prefix), prefix);

    const order = await transaction(async (client) => {
      const created = await OrderRepository.insertInTx(client, {
        reference,
        user_id: user.id,
        design_id: input.design_id ?? null,
        total,
        notes: input.notes ?? null,
      });
      for (const line of priced) {
        await OrderRepository.insertItemInTx(client, { ...line, order_id: created.id });
      }
      await OrderRepository.insertHistoryInTx(client, {
        order_id: created.id,
        status: "pending",
        note: "Order received.",
        changed_by: user.id,
      });
      return created;
    });

    const full = await OrderRepository.find(order.id);
    return orderResponse(full!, await OrderRepository.items(order.id));
  },

  /** Admin only — the route enforces that before calling in. */
  async updateStatus(admin: AuthUser, id: number, input: z.infer<typeof updateOrderStatusSchema>) {
    const order = await OrderRepository.find(id);
    if (!order) throw ApiError.notFound("No such order.");

    const next = input.status as OrderStatus;
    if (!ORDER_STATUSES.includes(next)) throw ApiError.badRequest("Unknown status.");
    if (next !== order.status && !FLOW[order.status].includes(next)) {
      throw ApiError.badRequest(`An order cannot move from ${order.status} to ${next}.`);
    }

    const updated = await OrderRepository.updateStatus(id, next);
    await OrderRepository.insertHistory({
      order_id: id,
      status: next,
      note: input.note ?? null,
      changed_by: admin.id,
    });

    const full = await OrderRepository.find(updated!.id);
    return orderResponse(full!, await OrderRepository.items(id));
  },

  async updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
    const order = await OrderRepository.find(id);
    if (!order) throw ApiError.notFound("No such order.");
    await OrderRepository.updatePaymentStatus(id, paymentStatus);
    const full = await OrderRepository.find(id);
    return orderResponse(full!, await OrderRepository.items(id));
  },
};
