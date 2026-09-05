import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, MessageCircle } from "lucide-react";
import { StatusStamp } from "@/components/StatusStamp";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Tracking | AK Print Studio" },
      {
        name: "description",
        content:
          "Live status of your AK print job: stage stamps, item breakdown, payment state and the full communication history.",
      },
      { property: "og:title", content: "Order Tracking | AK Print Studio" },
      { property: "og:description", content: "Live status of your AK print job." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();
  const id = Number(orderId);
  const { data: order } = useQuery({ queryKey: ["order", id], queryFn: () => api.getOrder(id) });
  const { data: history } = useQuery({ queryKey: ["history", id], queryFn: () => api.orderHistory(id) });
  const { data: comms } = useQuery({ queryKey: ["comms", id], queryFn: () => api.communications(id) });

  if (!order) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <Link
        to="/orders"
        className="text-receipt inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All orders
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-receipt text-muted-foreground">Order reference</p>
          <h1 className="text-display text-4xl font-bold">{order.reference}</h1>
        </div>
        <div className="text-right">
          <p className="text-receipt text-muted-foreground">Total · {order.payment_status}</p>
          <p className="text-display text-3xl font-bold">${order.total.toFixed(2)}</p>
        </div>
      </div>

      <section className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card p-6 paper-grain">
        <StatusStamp status={order.status} />
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-display text-xl font-bold">What&apos;s being printed</h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-start gap-4 py-4">
                <span className="text-display text-2xl font-bold text-muted-foreground">
                  ×{item.quantity}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="text-receipt mt-1 text-muted-foreground">
                    {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Standard"}
                  </p>
                </div>
                <span className="font-mono text-sm">${(item.unit_price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {order.notes && (
            <p className="mt-4 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
              “{order.notes}”
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-display text-xl font-bold">Timeline</h2>
          <ol className="mt-4 space-y-4">
            {(history ?? []).map((e) => (
              <li key={e.id} className="relative border-l border-border pl-5">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent" />
                <p className="text-sm font-medium">{e.note}</p>
                <p className="text-receipt mt-1 text-muted-foreground">
                  {new Date(e.changed_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>

          <h3 className="text-receipt mt-8 text-muted-foreground">Messages sent</h3>
          <ul className="mt-3 space-y-2">
            {(comms ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                {c.channel === "whatsapp" ? (
                  <MessageCircle className="size-4 text-success" />
                ) : (
                  <Mail className="size-4 text-accent" />
                )}
                {c.summary}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/assistant">Ask about this order</Link>
        </Button>
        <Button asChild>
          <Link to="/products">Order again</Link>
        </Button>
      </div>
    </div>
  );
}
