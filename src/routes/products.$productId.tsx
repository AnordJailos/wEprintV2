import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, getUser, type ProductOption } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "Configure Your Print | AK Print Studio" },
      {
        name: "description",
        content:
          "Pick colours, sizes and print placement, set your quantity and see live volume pricing before you order.",
      },
      { property: "og:title", content: "Configure Your Print | AK Print Studio" },
      { property: "og:description", content: "Live volume pricing on custom print jobs." },
    ],
  }),
  component: ProductDetail,
});

function volumePrice(base: number, qty: number) {
  if (qty >= 100) return base * 0.62;
  if (qty >= 50) return base * 0.72;
  if (qty >= 25) return base * 0.82;
  if (qty >= 10) return base * 0.92;
  return base;
}

function ProductDetail() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(Number(productId)),
  });

  const [selected, setSelected] = useState<Record<string, ProductOption>>({});
  const [qty, setQty] = useState(10);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const groups = useMemo(() => {
    const g: Record<string, ProductOption[]> = {};
    (product?.options ?? []).forEach((o) => {
      (g[o.option_type] ??= []).push(o);
    });
    return g;
  }, [product]);

  if (!product) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const deltas = Object.values(selected).reduce((sum, o) => sum + (o.price_delta ?? 0), 0);
  const unit = volumePrice(product.base_price, qty) + deltas;
  const total = unit * qty;

  const placeOrder = async () => {
    if (!getUser()) {
      toast.info("Sign in first so we can track your job.");
      navigate({ to: "/auth" });
      return;
    }
    setPlacing(true);
    try {
      const order = await api.createOrder({
        items: [
          {
            product_id: product.id,
            quantity: qty,
            options: Object.fromEntries(
              Object.entries(selected).map(([k, v]) => [k, v.option_value]),
            ),
          },
        ],
        notes,
      });
      toast.success(`Order ${order.reference} received`);
      navigate({ to: "/orders/$orderId", params: { orderId: String(order.id) } });
    } catch {
      toast.error("We couldn't place that order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10">
      <Link
        to="/products"
        className="text-receipt inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to catalogue
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-4/5 w-full object-cover"
            width={900}
            height={1100}
          />
        </div>

        <div>
          <p className="text-receipt text-muted-foreground">{product.category}</p>
          <h1 className="text-display mt-2 text-4xl font-bold">{product.name}</h1>
          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-8 space-y-7">
            {Object.entries(groups).map(([type, options]) => (
              <div key={type}>
                <p className="text-receipt mb-3 text-muted-foreground">{type}</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => {
                    const active = selected[type]?.id === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelected((s) => ({ ...s, [type]: o }))}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all",
                          active
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border hover:border-foreground/30",
                        )}
                      >
                        {o.swatch && (
                          <span
                            className="size-4 rounded-full border border-border"
                            style={{ backgroundColor: o.swatch }}
                          />
                        )}
                        {o.option_value}
                        {o.price_delta ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            +${o.price_delta}
                          </span>
                        ) : null}
                        {active && <Check className="size-3.5 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="text-receipt mb-3 text-muted-foreground">Quantity</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border border-border">
                  <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 5))}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-14 text-center font-mono text-sm font-semibold">{qty}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty((q) => q + 5)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  {[10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQty(n)}
                      className="text-receipt rounded-full border border-border px-3 py-1.5 hover:border-foreground/40"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-receipt mb-3 text-muted-foreground">Notes for the studio</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Pantone matches, deadlines, anything we should know."
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between font-mono text-sm">
              <span className="text-muted-foreground">Unit price</span>
              <span>${unit.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span>× {qty}</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-receipt text-muted-foreground">Estimated total</span>
              <span className="text-display text-3xl font-bold">${total.toFixed(2)}</span>
            </div>
            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={!product.is_available || placing}
              onClick={placeOrder}
            >
              {placing && <Loader2 className="size-4 animate-spin" />}
              {product.is_available ? "Place this order" : "Currently unavailable"}
            </Button>
            <p className="text-receipt mt-3 text-center text-muted-foreground">
              Upload artwork in the <Link to="/studio" className="text-accent">Design Studio</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
