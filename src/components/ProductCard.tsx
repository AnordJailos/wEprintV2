import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const colors = product.options.filter((o) => o.option_type === "color");

  return (
    <Link
      to="/products/$productId"
      params={{ productId: String(product.id) }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {!product.is_available && (
          <span className="text-receipt absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-primary-foreground">
            Sold out
          </span>
        )}
        <span className="text-receipt absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1">
          {product.lead_time}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-receipt text-muted-foreground">{product.category}</p>
        <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-mono text-sm font-semibold">
            from ${product.base_price.toFixed(2)}
          </span>
          <div className="flex -space-x-1.5">
            {colors.slice(0, 4).map((c) => (
              <span
                key={c.id}
                title={c.option_value}
                className={cn("size-4 rounded-full border-2 border-card")}
                style={{ backgroundColor: c.swatch ?? "var(--muted)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
