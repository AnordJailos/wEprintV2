import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Shop Custom Print Products | AK Print Studio" },
      {
        name: "description",
        content:
          "Screen-printed tees, riso posters, die-cut stickers, letterpress cards and signage — priced per piece with volume breaks.",
      },
      { property: "og:title", content: "Shop Custom Print Products | AK Print Studio" },
      { property: "og:description", content: "Apparel, posters, stickers, stationery and signage." },
    ],
  }),
  component: Products,
});

const CATEGORIES = ["all", "apparel", "print", "stickers", "stationery", "signage"];

function Products() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", category, search],
    queryFn: () => api.listProducts({ category, search }),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14">
      <h1 className="text-display text-4xl font-bold sm:text-5xl">The catalogue</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Every item here is printed in-house. Choose a base, then make it yours in the next step.
      </p>

      <div className="mt-10 flex flex-col gap-4 rule-y py-4 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
              className="rounded-full capitalize"
            >
              {c}
            </Button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-4/5 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-muted-foreground">
          Nothing matches that yet — try another category.
        </p>
      )}
    </div>
  );
}
