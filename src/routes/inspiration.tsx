import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/inspiration")({
  head: () => ({
    meta: [
      { title: "Inspiration Board — Pinterest Picks | AK Print Studio" },
      {
        name: "description",
        content:
          "A curated board of print directions pulled from Pinterest and the AK studio archive: typography, texture, badges and layouts.",
      },
      { property: "og:title", content: "Inspiration Board | AK Print Studio" },
      { property: "og:description", content: "Curated print directions to start your design from." },
    ],
  }),
  component: Inspiration,
});

const TAGS = ["all", "typography", "poster", "apparel", "texture", "stickers", "logo", "layout", "badge"];

function Inspiration() {
  const [tag, setTag] = useState("all");
  const { data } = useQuery({ queryKey: ["inspiration", tag], queryFn: () => api.listInspiration(tag) });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14">
      <h1 className="text-display text-4xl font-bold sm:text-5xl">Inspiration board</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Saved directions from Pinterest and our own archive. Find something close, then tell us what
        to change.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 rule-y py-4">
        {TAGS.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tag === t ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setTag(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      <div className="mt-8 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {(data ?? []).map((item, i) => (
          <a
            key={item.id}
            href={item.external_url}
            target="_blank"
            rel="noreferrer noopener"
            className="group relative block break-inside-avoid overflow-hidden rounded-xl border border-border"
          >
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ aspectRatio: i % 3 === 0 ? "3/4" : i % 3 === 1 ? "1/1" : "4/5" }}
            />
            <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-primary/90 to-transparent p-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <p className="text-sm font-semibold text-primary-foreground">{item.title}</p>
              <p className="text-receipt mt-1 flex items-center gap-1.5 text-primary-foreground/70">
                {item.source} <ExternalLink className="size-3" />
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
