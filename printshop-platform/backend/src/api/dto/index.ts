/**
 * Request schemas (zod) and response mappers.
 *
 * This is the contract boundary. The frontend reads exactly these field names —
 * `image`, `lead_time`, `is_available`, `customer_name`, `sent_at`, … — so a
 * rename here is a breaking change to the app. Row shapes come from
 * `entities/types.ts`; nothing raw is ever returned to a client, which is how a
 * `password_hash` cannot escape by accident.
 */
import { z } from 'zod';

import { config } from '@/core/config';
import type { AuthUser } from '@/core/auth';
import {
  ORDER_STATUSES,
  money,
  type CommunicationRow,
  type DesignRow,
  type InspirationRow,
  type KnowledgeEntryRow,
  type OrderItemRow,
  type OrderStatusHistoryRow,
  type ProductOptionRow,
  type ProductRow,
  type UserRow,
} from '@/entities/types';
import type { OrderWithCustomer } from '@/repository/order.repository';

/* ------------------------------------------------------------------- auth --- */

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
  phone: z.string().trim().min(6).max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(200) });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(6).max(30).optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, { message: 'Nothing to update.' });

export function userResponse(u: UserRow | AuthUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? undefined,
  };
}

/* --------------------------------------------------------------- products --- */

export const productQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.')
    .optional(),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().max(4000).default(''),
  base_price: z.coerce.number().min(0).max(10_000_000),
  lead_time: z.string().trim().max(60).default('3-5 working days'),
  image_url: z.string().trim().url().max(600).nullable().optional(),
  image: z.string().trim().url().max(600).nullable().optional(), // alias the UI may send
  is_available: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  category: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(4000).optional(),
  base_price: z.coerce.number().min(0).max(10_000_000).optional(),
  lead_time: z.string().trim().max(60).optional(),
  image_url: z.string().trim().url().max(600).nullable().optional(),
  image: z.string().trim().url().max(600).nullable().optional(),
  is_available: z.boolean().optional(),
});

export const createProductOptionSchema = z.object({
  option_type: z.enum(['color', 'size', 'placement', 'material']),
  option_value: z.string().trim().min(1).max(120),
  swatch: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional(),
  price_delta: z.coerce.number().min(-1_000_000).max(1_000_000).default(0),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export function productOptionResponse(o: ProductOptionRow) {
  return {
    id: o.id,
    product_id: o.product_id,
    option_type: o.option_type,
    option_value: o.option_value,
    swatch: o.swatch ?? undefined,
    price_delta: o.price_delta === null ? undefined : money(o.price_delta),
  };
}

export function productResponse(p: ProductRow, options: ProductOptionRow[] = []) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    description: p.description,
    base_price: money(p.base_price),
    lead_time: p.lead_time,
    is_available: p.is_available,
    // `image` is what the UI renders; `image_url` is kept for API consumers.
    image: p.image_url ?? '',
    image_url: p.image_url,
    options: options.map(productOptionResponse),
  };
}

/* ---------------------------------------------------------------- designs --- */

export const designQuerySchema = z.object({
  order_id: z.coerce.number().int().min(1).optional(),
});

export function designResponse(d: DesignRow) {
  const base = config().publicBaseUrl.replace(/\/$/, '');
  return {
    id: d.id,
    user_id: d.user_id,
    order_id: d.order_id ?? undefined,
    file_name: d.file_name,
    file_url: `${base}/api/v1/uploads/${d.file_path}`,
    mime_type: d.mime_type,
    size_bytes: Number(d.size_bytes),
    notes: d.notes ?? '',
    uploaded_at: d.uploaded_at,
  };
}

/* ------------------------------------------------------------ inspiration --- */

export const inspirationQuerySchema = z.object({ tag: z.string().trim().max(40).optional() });

export const createInspirationSchema = z.object({
  title: z.string().trim().min(2).max(200),
  source: z.enum(['pinterest', 'studio']),
  external_url: z.string().trim().url().max(600),
  image_url: z.string().trim().url().max(600).optional(),
  image: z.string().trim().url().max(600).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export function inspirationResponse(i: InspirationRow) {
  return {
    id: i.id,
    title: i.title,
    source: i.source,
    external_url: i.external_url,
    image: i.image_url,
    image_url: i.image_url,
    tags: i.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

/* ----------------------------------------------------------------- orders --- */

export const orderQuerySchema = z.object({
  status: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().int().min(1),
        quantity: z.coerce.number().int().min(1).max(100_000),
        options: z.record(z.string().max(60), z.string().max(200)).optional(),
      }),
    )
    .min(1, 'An order needs at least one item.')
    .max(50),
  design_id: z.coerce.number().int().min(1).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

export const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(['unpaid', 'deposit', 'paid', 'refunded']),
});

export function orderItemResponse(i: OrderItemRow) {
  return {
    id: i.id,
    product_id: i.product_id,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: money(i.unit_price),
    options: i.options ?? {},
  };
}

export function orderResponse(o: OrderWithCustomer, items: OrderItemRow[] = []) {
  return {
    id: o.id,
    reference: o.reference,
    user_id: o.user_id,
    design_id: o.design_id ?? undefined,
    status: o.status,
    payment_status: o.payment_status,
    total: money(o.total),
    notes: o.notes ?? '',
    customer_name: o.customer_name,
    created_at: o.created_at,
    updated_at: o.updated_at,
    items: items.map(orderItemResponse),
  };
}

export function statusEventResponse(h: OrderStatusHistoryRow) {
  return { id: h.id, status: h.status, note: h.note ?? '', changed_at: h.changed_at };
}

/* --------------------------------------------------------- communications --- */

export const sendEmailSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  subject: z.string().trim().max(200).optional(),
});

export function communicationResponse(c: CommunicationRow) {
  return { id: c.id, order_id: c.order_id, channel: c.channel, summary: c.summary, sent_at: c.sent_at };
}

/* --------------------------------------------------------------------- ai --- */

export const chatSchema = z.object({
  question: z.string().trim().min(2, 'Ask a slightly longer question.').max(2000),
  conversation_id: z.string().trim().max(64).optional(),
});

export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(10).max(40_000),
  category: z.string().trim().max(60).nullable().optional(),
  is_published: z.boolean().optional(),
});

export const updateKnowledgeSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(10).max(40_000).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  is_published: z.boolean().optional(),
});

export function knowledgeResponse(k: KnowledgeEntryRow) {
  return {
    id: k.id,
    title: k.title,
    content: k.content,
    category: k.category ?? undefined,
    is_published: k.is_published,
    updated_at: k.updated_at,
  };
}
