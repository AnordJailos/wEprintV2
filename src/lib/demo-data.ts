import poster from "@/assets/product-poster.jpg";
import stickers from "@/assets/product-stickers.jpg";
import cards from "@/assets/product-cards.jpg";
import cap from "@/assets/product-cap.jpg";
import tee from "@/assets/hero-studio.jpg";

/**
 * Demo catalogue. Used ONLY as a fallback by lib/api.ts when the Rust backend
 * isn't reachable, so the interface stays explorable in preview.
 */

export type Role = "guest" | "customer" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
};

export type ProductOption = {
  id: number;
  option_type: "color" | "size" | "placement" | "material";
  option_value: string;
  swatch?: string;
  price_delta?: number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  base_price: number;
  lead_time: string;
  is_available: boolean;
  image: string;
  options: ProductOption[];
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "quality_check"
  | "ready"
  | "delivered";

export type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  options: Record<string, string>;
};

export type Order = {
  id: number;
  reference: string;
  status: OrderStatus;
  payment_status: "unpaid" | "deposit" | "paid";
  total: number;
  created_at: string;
  customer_name: string;
  notes: string;
  items: OrderItem[];
};

export type StatusEvent = {
  id: number;
  status: OrderStatus;
  note: string;
  changed_at: string;
};

export type Design = {
  id: number;
  file_name: string;
  file_url: string;
  notes: string;
  uploaded_at: string;
};

export type InspirationItem = {
  id: number;
  title: string;
  source: "pinterest" | "studio";
  external_url: string;
  image: string;
  tags: string[];
};

export type Communication = {
  id: number;
  channel: "whatsapp" | "email";
  summary: string;
  sent_at: string;
};

export type DashboardMetrics = {
  orders_today: number;
  revenue_month: number;
  open_orders: number;
  avg_turnaround_days: number;
  by_status: { status: OrderStatus; count: number }[];
  revenue_trend: { label: string; value: number }[];
};

const img = (seed: string, w = 900, h = 1100) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

export const ORDER_STAGES: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "in_production", label: "On Press" },
  { status: "quality_check", label: "Quality" },
  { status: "ready", label: "Ready" },
  { status: "delivered", label: "Delivered" },
];

export const demoProducts: Product[] = [
  {
    id: 1,
    name: "Heavyweight Screen-Print Tee",
    slug: "heavyweight-tee",
    category: "apparel",
    description:
      "240gsm combed cotton, printed with plastisol inks that survive a hundred washes. Up to four spot colours, front and back.",
    base_price: 18,
    lead_time: "3–5 days",
    is_available: true,
    image: tee,
    options: [
      { id: 1, option_type: "color", option_value: "Ink Black", swatch: "#1C1917" },
      { id: 2, option_type: "color", option_value: "Paper White", swatch: "#F5F1E8" },
      { id: 3, option_type: "color", option_value: "Signal Orange", swatch: "#E85D2C" },
      { id: 4, option_type: "color", option_value: "Thread Navy", swatch: "#2B3A67" },
      { id: 5, option_type: "size", option_value: "S" },
      { id: 6, option_type: "size", option_value: "M" },
      { id: 7, option_type: "size", option_value: "L" },
      { id: 8, option_type: "size", option_value: "XL" },
      { id: 9, option_type: "placement", option_value: "Centre chest" },
      { id: 10, option_type: "placement", option_value: "Left pocket" },
      { id: 11, option_type: "placement", option_value: "Full back" },
    ],
  },
  {
    id: 2,
    name: "A2 Riso Art Poster",
    slug: "a2-riso-poster",
    category: "print",
    description:
      "Two-colour risograph on 170gsm uncoated stock. Every pull is slightly different — that's the point.",
    base_price: 9,
    lead_time: "2–4 days",
    is_available: true,
    image: poster,
    options: [
      { id: 20, option_type: "material", option_value: "Uncoated 170gsm" },
      { id: 21, option_type: "material", option_value: "Recycled kraft" },
      { id: 22, option_type: "size", option_value: "A3" },
      { id: 23, option_type: "size", option_value: "A2", price_delta: 4 },
    ],
  },
  {
    id: 3,
    name: "Die-Cut Vinyl Stickers",
    slug: "die-cut-stickers",
    category: "stickers",
    description: "Weatherproof matte vinyl, cut to any outline. Sold in packs of 50.",
    base_price: 24,
    lead_time: "48 hours",
    is_available: true,
    image: stickers,
    options: [
      { id: 30, option_type: "material", option_value: "Matte vinyl" },
      { id: 31, option_type: "material", option_value: "Holographic", price_delta: 8 },
      { id: 32, option_type: "size", option_value: "50mm" },
      { id: 33, option_type: "size", option_value: "75mm" },
    ],
  },
  {
    id: 4,
    name: "Letterpress Business Cards",
    slug: "letterpress-cards",
    category: "stationery",
    description: "600gsm cotton stock with a deep bite you can feel. Box of 100.",
    base_price: 65,
    lead_time: "5–7 days",
    is_available: true,
    image: cards,
    options: [
      { id: 40, option_type: "material", option_value: "Natural cotton" },
      { id: 41, option_type: "material", option_value: "Black duplex", price_delta: 15 },
    ],
  },
  {
    id: 5,
    name: "Embroidered Cap",
    slug: "embroidered-cap",
    category: "apparel",
    description: "Six-panel structured cap, up to 8,000 stitches of flat embroidery.",
    base_price: 26,
    lead_time: "5–7 days",
    is_available: true,
    image: cap,
    options: [
      { id: 50, option_type: "color", option_value: "Ink Black", swatch: "#1C1917" },
      { id: 51, option_type: "color", option_value: "Ochre", swatch: "#C68B3D" },
      { id: 52, option_type: "placement", option_value: "Front panel" },
    ],
  },
  {
    id: 6,
    name: "Roll-Up Banner 850mm",
    slug: "rollup-banner",
    category: "signage",
    description: "Large-format latex print on blockout PVC with an aluminium cassette.",
    base_price: 89,
    lead_time: "3 days",
    is_available: false,
    image: img("photo-1552664730-d307ca884978"),
    options: [{ id: 60, option_type: "size", option_value: "850 × 2000mm" }],
  },
];

export const demoInspiration: InspirationItem[] = [
  {
    id: 1,
    title: "Bold type, one colour",
    source: "pinterest",
    external_url: "https://www.pinterest.com/search/pins/?q=screen%20print%20poster",
    image: img("photo-1523362628745-0c100150b504", 800, 1000),
    tags: ["typography", "poster"],
  },
  {
    id: 2,
    title: "Workwear patch energy",
    source: "pinterest",
    external_url: "https://www.pinterest.com/search/pins/?q=embroidered%20patch%20design",
    image: img("photo-1618354691373-d851c5c3a990", 800, 1000),
    tags: ["apparel", "badge"],
  },
  {
    id: 3,
    title: "Halftone portraits",
    source: "studio",
    external_url: "https://www.pinterest.com/search/pins/?q=halftone%20print",
    image: img("photo-1512418490979-92798cec1380", 800, 1000),
    tags: ["texture", "poster"],
  },
  {
    id: 4,
    title: "Monoline logo marks",
    source: "pinterest",
    external_url: "https://www.pinterest.com/search/pins/?q=monoline%20logo",
    image: img("photo-1600185365483-26d7a4cc7519", 800, 1000),
    tags: ["logo", "apparel"],
  },
  {
    id: 5,
    title: "Sticker sheet layouts",
    source: "studio",
    external_url: "https://www.pinterest.com/search/pins/?q=sticker%20sheet",
    image: img("photo-1607083206968-13611e3d76db", 800, 1000),
    tags: ["stickers"],
  },
  {
    id: 6,
    title: "Editorial grids",
    source: "pinterest",
    external_url: "https://www.pinterest.com/search/pins/?q=editorial%20layout",
    image: img("photo-1503694978374-8a2fa686963a", 800, 1000),
    tags: ["typography", "layout"],
  },
  {
    id: 7,
    title: "Two-colour risograph",
    source: "pinterest",
    external_url: "https://www.pinterest.com/search/pins/?q=risograph",
    image: img("photo-1550684376-efcbd6e3f031", 800, 1000),
    tags: ["texture", "poster"],
  },
  {
    id: 8,
    title: "Vintage sports lettering",
    source: "studio",
    external_url: "https://www.pinterest.com/search/pins/?q=vintage%20sports%20lettering",
    image: img("photo-1503341504253-dff4815485f1", 800, 1000),
    tags: ["typography", "apparel"],
  },
];

export const demoDesigns: Design[] = [
  {
    id: 1,
    file_name: "moon-hand-final.png",
    file_url: img("photo-1611262588024-d12430b98920", 600, 600),
    notes: "Single colour, centre chest, 24cm wide",
    uploaded_at: "2026-07-18T10:12:00Z",
  },
  {
    id: 2,
    file_name: "field-guide-cover.pdf",
    file_url: img("photo-1524995997946-a1c2e315a42f", 600, 600),
    notes: "A2 poster, two spot colours",
    uploaded_at: "2026-07-21T14:40:00Z",
  },
];

export const demoOrders: Order[] = [
  {
    id: 4821,
    reference: "AK-4821",
    status: "in_production",
    payment_status: "deposit",
    total: 360,
    created_at: "2026-07-24T09:15:00Z",
    customer_name: "Naledi M.",
    notes: "Please match the orange to Pantone 165C if possible.",
    items: [
      {
        product_id: 1,
        product_name: "Heavyweight Screen-Print Tee",
        quantity: 20,
        unit_price: 18,
        options: { color: "Ink Black", size: "L", placement: "Centre chest" },
      },
    ],
  },
  {
    id: 4809,
    reference: "AK-4809",
    status: "delivered",
    payment_status: "paid",
    total: 135,
    created_at: "2026-07-11T13:02:00Z",
    customer_name: "Naledi M.",
    notes: "",
    items: [
      {
        product_id: 2,
        product_name: "A2 Riso Art Poster",
        quantity: 15,
        unit_price: 9,
        options: { material: "Uncoated 170gsm", size: "A2" },
      },
    ],
  },
  {
    id: 4830,
    reference: "AK-4830",
    status: "pending",
    payment_status: "unpaid",
    total: 48,
    created_at: "2026-07-29T08:41:00Z",
    customer_name: "Thabo K.",
    notes: "Holographic if the budget allows.",
    items: [
      {
        product_id: 3,
        product_name: "Die-Cut Vinyl Stickers",
        quantity: 2,
        unit_price: 24,
        options: { material: "Matte vinyl", size: "75mm" },
      },
    ],
  },
];

export const demoHistory = (id: number): StatusEvent[] => {
  const order = demoOrders.find((o) => o.id === id) ?? demoOrders[0];
  const reached = ORDER_STAGES.findIndex((s) => s.status === order.status);
  const notes: Record<OrderStatus, string> = {
    pending: "Order received and queued for review.",
    confirmed: "Artwork approved, materials reserved.",
    in_production: "On the press.",
    quality_check: "Checked against the approved proof.",
    ready: "Packed and ready for collection.",
    delivered: "Handed over. Thank you!",
  };
  return ORDER_STAGES.slice(0, reached + 1).map((stage, i) => ({
    id: i + 1,
    status: stage.status,
    note: notes[stage.status],
    changed_at: new Date(Date.parse(order.created_at) + i * 86400000).toISOString(),
  }));
};

export const demoCommunications: Communication[] = [
  { id: 1, channel: "whatsapp", summary: "Proof sent for approval", sent_at: "2026-07-24T10:02:00Z" },
  { id: 2, channel: "email", summary: "Deposit invoice", sent_at: "2026-07-24T10:20:00Z" },
];

export const demoDashboard: DashboardMetrics = {
  orders_today: 7,
  revenue_month: 18420,
  open_orders: 12,
  avg_turnaround_days: 3.4,
  by_status: [
    { status: "pending", count: 4 },
    { status: "confirmed", count: 3 },
    { status: "in_production", count: 3 },
    { status: "quality_check", count: 1 },
    { status: "ready", count: 1 },
    { status: "delivered", count: 26 },
  ],
  revenue_trend: [
    { label: "Feb", value: 9200 },
    { label: "Mar", value: 11400 },
    { label: "Apr", value: 10250 },
    { label: "May", value: 14100 },
    { label: "Jun", value: 16800 },
    { label: "Jul", value: 18420 },
  ],
};
