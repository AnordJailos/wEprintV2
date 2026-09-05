import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, PackageSearch } from "lucide-react";
import { StatusPill, StatusStamp } from "@/components/StatusStamp";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ORDER_STAGES } from "@/lib/demo-data";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — Track Every Stage | AK Print Studio" },
      {
        name: "description",
        content:
          "Follow your print jobs through six stamped stages, from received to delivered, with a note at every hand-off.",
      },
      { property: "og:title", content: "My Orders | AK Print Studio" },
      { property: "og:description", content: "Track your custom print jobs stage by stage." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const [status, setStatus] = useState("all");
  const { data } = useQuery({ queryKey: ["orders", status], queryFn: () => api.listOrders({ status }) });

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14">
      <h1 className="text-display text-4xl font-bold sm:text-5xl">My orders</h1>
      <p className="mt-3 text-muted-foreground">Every job you&apos;ve sent to the press.</p>

      <div className="mt-8 flex flex-wrap gap-2 rule-y py-4">
        {["all", ...ORDER_STAGES.map((s) => s.status)].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setStatus(s)}
          >
            {s === "all" ? "All" : ORDER_STAGES.find((x) => x.status === s)?.label}
          </Button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {(data ?? []).map((order) => (
          <Link
            key={order.id}
            to="/orders/$orderId"
            params={{ orderId: String(order.id) }}
            className="group block rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold">{order.reference}</span>
              <StatusPill status={order.status} />
              <span className="text-receipt text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
              <span className="text-display ml-auto text-xl font-bold">
                ${order.total.toFixed(2)}
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {order.items.map((i) => `${i.quantity} × ${i.product_name}`).join(", ")}
            </p>
            <div className="mt-5">
              <StatusStamp status={order.status} compact />
            </div>
          </Link>
        ))}

        {data && data.length === 0 && (
          <div className="grid place-items-center rounded-xl border border-dashed border-border py-20 text-center">
            <PackageSearch className="size-8 text-muted-foreground" />
            <p className="mt-4 font-semibold">Nothing here yet</p>
            <Button asChild className="mt-5">
              <Link to="/products">Start your first job</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
