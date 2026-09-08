/**
 * THE ONLY FILE ALLOWED TO KNOW THE BACKEND URL EXISTS.
 *
 * Every page/component imports `api` from here. There is no other `fetch(` in
 * this codebase. If the Rust backend is not reachable (e.g. the Lovable
 * preview, or before you run `cargo run`), calls fall back to the demo
 * catalogue in `demo-data.ts` so the UI is always explorable.
 */
import {
  demoCommunications,
  demoDashboard,
  demoDesigns,
  demoHistory,
  demoInspiration,
  demoOrders,
  demoProducts,
  type Communication,
  type DashboardMetrics,
  type Design,
  type InspirationItem,
  type Order,
  type OrderStatus,
  type Product,
  type ProductOption,
  type StatusEvent,
  type User,
} from "./demo-data";

export type {
  Communication,
  DashboardMetrics,
  Design,
  InspirationItem,
  Order,
  OrderStatus,
  Product,
  ProductOption,
  StatusEvent,
  User,
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not configured");
}

/**
 * True only when no real backend URL is configured — i.e. the UI is running on
 * its built-in demo data. In production VITE_API_BASE_URL is always set, so
 * customer-facing pages must never mention demo mode.
 */
export const IS_DEMO = !(
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
);

const TOKEN_KEY = "ak_token";
const USER_KEY = "ak_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: User) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("ak-auth"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("ak-auth"));
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | undefined>;
};

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const url = new URL(BASE_URL.replace(/\/$/, "") + path, window.location.origin);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    // Backend unreachable (preview sandbox, or `cargo run` not started).
    throw new ApiError("NETWORK", "Backend unreachable", 0);
  }

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // A stale or demo JWT against a real backend: drop it so the UI stops
    // retrying with a token the server will never accept.
    if (res.status === 401) clearSession();
    const err = payload?.error ?? {};
    throw new ApiError(err.code ?? "UNKNOWN", err.message ?? res.statusText, res.status);
  }
  return payload as T;
}

/** Try the real backend; fall back to demo data so the UI is never dead. */
async function withDemo<T>(
  fn: () => Promise<T>,
  fallback: () => T,
  soft: number[] = [0, 401, 403, 404, 502],
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && !soft.includes(e.status)) throw e;
    return fallback();
  }
}

/** Auth must NOT fall back on a real 401 — wrong credentials have to fail. */
const OFFLINE_ONLY = [0];

export const api = {
  /* ---------------------------------------------------------------- auth */
  register: (data: { name: string; email: string; password: string }) =>
    withDemo(
      () => request<{ token: string; user: User }>("/auth/register", { method: "POST", body: data }),
      () => ({
        token: "demo-token",
        user: { id: 1, name: data.name, email: data.email, role: "customer" as const },
      }),
      OFFLINE_ONLY,
    ),

  login: (data: { email: string; password: string }) =>
    withDemo(
      () => request<{ token: string; user: User }>("/auth/login", { method: "POST", body: data }),
      () => ({
        token: "demo-token",
        user: {
          id: data.email.startsWith("admin") ? 99 : 1,
          name: data.email.startsWith("admin") ? "AK Admin" : "Guest Customer",
          email: data.email,
          role: (data.email.startsWith("admin") ? "admin" : "customer") as User["role"],
        },
      }),
      OFFLINE_ONLY,
    ),


  logout: () => withDemo(() => request<void>("/auth/logout", { method: "POST" }), () => undefined),

  forgotPassword: (email: string) =>
    withDemo(
      () => request<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } }),
      () => ({ message: "If that address exists, a reset link is on its way." }),
    ),

  me: () => withDemo(() => request<User>("/users/me"), () => getUser() as User),

  updateMe: (data: Partial<Pick<User, "name" | "phone">>) =>
    withDemo(
      () => request<User>("/users/me", { method: "PATCH", body: data }),
      () => ({ ...(getUser() as User), ...data }),
    ),

  /* ------------------------------------------------------------ products */
  listProducts: (params: { category?: string; search?: string } = {}) =>
    withDemo(
      () => request<{ data: Product[] }>("/products", { query: params }).then((r) => r.data),
      () =>
        demoProducts.filter(
          (p) =>
            (!params.category || params.category === "all" || p.category === params.category) &&
            (!params.search || p.name.toLowerCase().includes(params.search.toLowerCase())),
        ),
    ),

  getProduct: (id: number) =>
    withDemo(
      () => request<Product>(`/products/${id}`),
      () => demoProducts.find((p) => p.id === id) ?? demoProducts[0],
    ),

  createProduct: (data: Partial<Product>) =>
    withDemo(
      () => request<Product>("/products", { method: "POST", body: data }),
      () => ({ ...demoProducts[0], ...data, id: Date.now() }) as Product,
    ),

  updateProduct: (id: number, data: Partial<Product>) =>
    withDemo(
      () => request<Product>(`/products/${id}`, { method: "PATCH", body: data }),
      () => ({ ...(demoProducts.find((p) => p.id === id) ?? demoProducts[0]), ...data }) as Product,
    ),

  deleteProduct: (id: number) =>
    withDemo(() => request<void>(`/products/${id}`, { method: "DELETE" }), () => undefined),

  /* ------------------------------------------- designs & inspiration */
  uploadDesign: (file: File, notes: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("notes", notes);
    return withDemo(
      () => request<Design>("/designs", { method: "POST", formData: fd }),
      () => ({
        id: Date.now(),
        file_name: file.name,
        file_url: URL.createObjectURL(file),
        notes,
        uploaded_at: new Date().toISOString(),
      }),
    );
  },

  listDesigns: () => withDemo(() => request<{ data: Design[] }>("/designs").then((r) => r.data), () => demoDesigns),

  deleteDesign: (id: number) =>
    withDemo(() => request<void>(`/designs/${id}`, { method: "DELETE" }), () => undefined),

  listInspiration: (tag?: string) =>
    withDemo(
      () => request<{ data: InspirationItem[] }>("/inspiration", { query: { tag } }).then((r) => r.data),
      () => (tag && tag !== "all" ? demoInspiration.filter((i) => i.tags.includes(tag)) : demoInspiration),
    ),

  /* -------------------------------------------------------------- orders */
  createOrder: (data: {
    items: { product_id: number; quantity: number; options?: Record<string, string> }[];
    design_id?: number;
    notes?: string;
  }) =>
    withDemo(
      () => request<Order>("/orders", { method: "POST", body: data }),
      () => {
        const product = demoProducts.find((p) => p.id === data.items[0].product_id) ?? demoProducts[0];
        return {
          id: Math.floor(1000 + Math.random() * 8999),
          reference: `AK-${Math.floor(1000 + Math.random() * 8999)}`,
          status: "pending" as OrderStatus,
          payment_status: "unpaid" as const,
          total: product.base_price * data.items[0].quantity,
          created_at: new Date().toISOString(),
          customer_name: getUser()?.name ?? "Guest",
          notes: data.notes ?? "",
          items: data.items.map((i) => ({
            product_id: i.product_id,
            product_name: product.name,
            quantity: i.quantity,
            unit_price: product.base_price,
            options: i.options ?? {},
          })),
        };
      },
    ),

  listOrders: (params: { status?: string } = {}) =>
    withDemo(
      () => request<{ data: Order[] }>("/orders", { query: params }).then((r) => r.data),
      () => (params.status && params.status !== "all" ? demoOrders.filter((o) => o.status === params.status) : demoOrders),
    ),

  getOrder: (id: number) =>
    withDemo(() => request<Order>(`/orders/${id}`), () => demoOrders.find((o) => o.id === id) ?? demoOrders[0]),

  updateOrderStatus: (id: number, status: OrderStatus) =>
    withDemo(
      () => request<Order>(`/orders/${id}/status`, { method: "PATCH", body: { status } }),
      () => ({ ...(demoOrders.find((o) => o.id === id) ?? demoOrders[0]), status }),
    ),

  updatePaymentStatus: (id: number, payment_status: Order["payment_status"]) =>
    withDemo(
      () => request<Order>(`/orders/${id}/payment-status`, { method: "PATCH", body: { payment_status } }),
      () => ({ ...(demoOrders.find((o) => o.id === id) ?? demoOrders[0]), payment_status }),
    ),

  orderHistory: (id: number) =>
    withDemo(
      () => request<{ data: StatusEvent[] }>(`/orders/${id}/history`).then((r) => r.data),
      () => demoHistory(id),
    ),

  /* ------------------------------------------------------- communication */
  whatsappLink: (id: number) =>
    withDemo(
      () => request<{ url: string }>(`/orders/${id}/notify/whatsapp-link`, { method: "POST" }),
      () => ({
        url: `https://wa.me/?text=${encodeURIComponent(`Hello from AK Print Studio — an update on order AK-${id}.`)}`,
      }),
    ),

  sendEmail: (id: number, message: string) =>
    withDemo(
      () => request<{ sent: boolean }>(`/orders/${id}/notify/email`, { method: "POST", body: { message } }),
      () => ({ sent: true }),
    ),

  communications: (id: number) =>
    withDemo(
      () => request<{ data: Communication[] }>(`/orders/${id}/communications`).then((r) => r.data),
      () => demoCommunications,
    ),

  /* ----------------------------------------------------------------- ai */
  chat: (question: string) =>
    withDemo(
      () => request<{ answer: string; sources: string[] }>("/ai/chat", { method: "POST", body: { question } }),
      () => demoAnswer(question),
    ),

  /**
   * Streaming chat: POSTs to /ai/chat/stream and invokes callbacks as SSE
   * events arrive. Returns the final { answer, sources }. In demo mode (or on
   * network/soft failures) the canned answer is "typed" word by word so the
   * UI behaves identically.
   */
  chatStream: async (
    question: string,
    handlers: {
      onSources?: (sources: string[]) => void;
      onDelta?: (text: string) => void;
    } = {},
  ): Promise<{ answer: string; sources: string[] }> => {
    const demo = async () => {
      const d = demoAnswer(question);
      handlers.onSources?.(d.sources);
      let built = "";
      for (const w of d.answer.match(/\S+\s*/g) ?? []) {
        built += w;
        handlers.onDelta?.(w);
        await new Promise((r) => setTimeout(r, 20));
      }
      return { answer: built.trim(), sources: d.sources };
    };

    try {
      const url = new URL(BASE_URL.replace(/\/$/, "") + "/ai/chat/stream", window.location.origin);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) {
        if (res.status === 401) clearSession();
        if ([0, 401, 403, 404, 502].includes(res.status)) return demo();
        const payload = await res.json().catch(() => null);
        throw new ApiError(payload?.error?.code ?? "UNKNOWN", payload?.error?.message ?? res.statusText, res.status);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = "message";
      let final: { answer: string; sources: string[] } | null = null;

      const dispatch = (dataLine: string) => {
        try {
          const data = JSON.parse(dataLine);
          if (event === "sources") handlers.onSources?.(data.sources ?? []);
          else if (event === "delta") handlers.onDelta?.(data.text ?? "");
          else if (event === "done") final = { answer: data.answer ?? "", sources: data.sources ?? [] };
          else if (event === "error") throw new ApiError("STREAM", data.message ?? "Stream failed", 500);
        } catch (e) {
          if (e instanceof ApiError) throw e;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          event = "message";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dispatch(line.slice(5).trim());
          }
        }
      }
      if (final) return final;
      throw new ApiError("STREAM", "Stream ended without an answer", 500);
    } catch (e) {
      if (e instanceof ApiError && ![0, 401, 403, 404, 502].includes(e.status)) throw e;
      if (!(e instanceof ApiError) || e.status !== 500) return demo();
      throw e;
    }
  },

  /* -------------------------------------------------------------- admin */
  dashboard: () => withDemo(() => request<DashboardMetrics>("/admin/dashboard/metrics"), () => demoDashboard),
};

function demoAnswer(question: string): { answer: string; sources: string[] } {
  const q = question.toLowerCase();
  if (q.includes("price") || q.includes("cost"))
    return {
      answer:
        "Pricing starts at $18 for a single screen-printed tee and drops with volume — 25+ pieces move to $12.50 each. Posters start at $9 for A2 on uncoated stock. Send your artwork through the Design Studio and you get an exact quote back within an hour.",
      sources: ["Pricing & Volume Tiers"],
    };
  if (q.includes("file") || q.includes("artwork") || q.includes("design"))
    return {
      answer:
        "We accept PNG, PDF, SVG and AI files. Aim for 300 DPI at final print size, with fonts outlined and a transparent background. If you only have a rough idea, upload it anyway — the studio redraws it for free on orders over 20 pieces.",
      sources: ["Artwork Requirements", "Design Studio FAQ"],
    };
  if (q.includes("time") || q.includes("deliver") || q.includes("long"))
    return {
      answer:
        "Standard turnaround is 3–5 working days from approved proof. Rush (48h) is available on tees and stickers for a 30% surcharge. You can watch every stage move on your order tracking page.",
      sources: ["Turnaround & Delivery"],
    };
  return {
    answer:
      "AK is a custom print studio: apparel, posters, stickers, business cards and signage. Browse the catalogue, upload your own artwork or pull a direction from the Inspiration board, and place an order — I'll answer anything about materials, pricing or turnaround along the way.",
    sources: ["Studio Overview"],
  };
}
