import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mail, MessageCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "@/components/StatusStamp";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, getUser, type OrderStatus } from "@/lib/api";
import { ORDER_STAGES } from "@/lib/demo-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console | AK Print Studio" },
      {
        name: "description",
        content:
          "Studio dashboard: today's orders, monthly revenue, production queue, status changes and customer messaging.",
      },
      { property: "og:title", content: "Admin Console | AK Print Studio" },
      { property: "og:description", content: "Run the studio: orders, revenue and messaging." },
    ],
  }),
  component: AdminGate,
});

/**
 * The studio console is for the single admin account only.
 * The backend already refuses every /admin and write endpoint to non-admins
 * (AdminUser extractor -> 403); this gate keeps the UI honest as well.
 */
function AdminGate() {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getUser();
    if (user?.role === "admin") {
      setAllowed(true);
    } else {
      toast.error("Studio console is restricted to the studio owner.");
      navigate({ to: "/auth" });
    }
    setChecked(true);
  }, [navigate]);

  if (!checked || !allowed) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-sm text-muted-foreground">Checking studio credentials…</p>
      </div>
    );
  }
  return <Admin />;
}

function Admin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const { data: metrics } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: orders } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: () => api.listOrders({ status: filter }),
  });

  const cards = [
    { label: "Orders today", value: metrics?.orders_today ?? "—" },
    {
      label: "Revenue this month",
      value: metrics ? `$${metrics.revenue_month.toLocaleString()}` : "—",
    },
    { label: "Open jobs", value: metrics?.open_orders ?? "—" },
    { label: "Avg turnaround", value: metrics ? `${metrics.avg_turnaround_days}d` : "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-receipt text-muted-foreground">AK Print Studio</p>
          <h1 className="text-display text-4xl font-bold">Admin console</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/products">View storefront</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-receipt text-muted-foreground">{c.label}</p>
            <p className="text-display mt-2 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-display flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="size-5 text-accent" /> Revenue trend
          </h2>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.revenue_trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.8rem",
                  }}
                />
                <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-display text-xl font-bold">Production queue</h2>
          <ul className="mt-5 space-y-3">
            {(metrics?.by_status ?? []).map((s) => {
              const label = ORDER_STAGES.find((x) => x.status === s.status)?.label ?? s.status;
              const max = Math.max(...(metrics?.by_status ?? []).map((x) => x.count), 1);
              return (
                <li key={s.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-mono">{s.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${(s.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-display text-xl font-bold">Orders</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STAGES.map((s) => (
                <SelectItem key={s.status} value={s.status}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-receipt border-b border-border text-left text-muted-foreground">
                <th className="pb-3">Ref</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="py-4 font-mono font-medium">
                    <Link to="/orders/$orderId" params={{ orderId: String(o.id) }}>
                      {o.reference}
                    </Link>
                  </td>
                  <td className="py-4">{o.customer_name}</td>
                  <td className="py-4 text-muted-foreground">
                    {o.items.reduce((n, i) => n + i.quantity, 0)} pcs
                  </td>
                  <td className="py-4 font-mono">${o.total.toFixed(2)}</td>
                  <td className="py-4">
                    <Select
                      value={o.status}
                      onValueChange={async (v) => {
                        await api.updateOrderStatus(o.id, v as OrderStatus);
                        toast.success(`${o.reference} → ${v.replace("_", " ")}`);
                        qc.invalidateQueries({ queryKey: ["admin-orders"] });
                      }}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STAGES.map((s) => (
                          <SelectItem key={s.status} value={s.status}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="WhatsApp update"
                        onClick={async () => {
                          const { url } = await api.whatsappLink(o.id);
                          window.open(url, "_blank", "noopener");
                        }}
                      >
                        <MessageCircle className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Email update"
                        onClick={async () => {
                          await api.sendEmail(o.id, `Update on ${o.reference}`);
                          toast.success("Email queued");
                        }}
                      >
                        <Mail className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <StatusPill status="in_production" />
          <p className="text-sm text-muted-foreground">
            Changing a status writes an order_status_history row on the backend and can trigger a
            customer notification.
          </p>
        </div>
      </section>
    </div>
  );
}
