/**
 * Row shapes, one per table.
 *
 * These names match the SQL columns exactly and the table names match the
 * original schema (`users`, `products`, `product_options`, `designs`,
 * `inspiration_items`, `orders`, `order_items`, `order_status_history`,
 * `communications`, `knowledge_base_entries`, `knowledge_base_embeddings`).
 * Nothing here may be renamed without a migration — the frontend reads these
 * field names through the DTO mappers.
 */

export type Role = "customer" | "admin";

export type OrderStatus =
  "pending" | "confirmed" | "in_production" | "quality_check" | "ready" | "delivered" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "in_production",
  "quality_check",
  "ready",
  "delivered",
  "cancelled",
];

export type PaymentStatus = "unpaid" | "deposit" | "paid" | "refunded";
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "deposit", "paid", "refunded"];

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  role: Role;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
};

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  base_price: string | number;
  lead_time: string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductOptionRow = {
  id: number;
  product_id: number;
  option_type: string;
  option_value: string;
  swatch: string | null;
  price_delta: string | number | null;
  sort_order: number;
};

export type DesignRow = {
  id: number;
  user_id: number;
  order_id: number | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: string | number;
  notes: string | null;
  uploaded_at: string;
};

export type InspirationRow = {
  id: number;
  title: string;
  source: string;
  external_url: string;
  image_url: string;
  tags: string;
  created_at: string;
};

export type OrderRow = {
  id: number;
  reference: string;
  user_id: number;
  design_id: number | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  options: Record<string, string>;
};

export type OrderStatusHistoryRow = {
  id: number;
  order_id: number;
  status: OrderStatus;
  note: string | null;
  changed_by: number | null;
  changed_at: string;
};

export type CommunicationRow = {
  id: number;
  order_id: number;
  channel: "whatsapp" | "email";
  summary: string;
  payload: string | null;
  sent_by: number | null;
  sent_at: string;
};

export type KnowledgeEntryRow = {
  id: number;
  title: string;
  content: string;
  category: string | null;
  is_published: boolean;
  updated_at: string;
};

/** NUMERIC comes back from pg as a string; money is rendered as a number. */
export function money(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value) * 100) / 100;
}
