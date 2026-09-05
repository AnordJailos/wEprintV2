import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Upload, Truck, MessageCircle } from "lucide-react";
import hero from "@/assets/hero-studio.jpg";
import { RegistrationMark } from "@/components/RegistrationMark";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AK Print Studio — Custom Printing, Designed With You" },
      {
        name: "description",
        content:
          "Upload your artwork or explore Pinterest-sourced inspiration, order custom apparel, posters and stickers, and track every stage on press.",
      },
      { property: "og:title", content: "AK Print Studio — Custom Printing, Designed With You" },
      {
        property: "og:description",
        content: "Upload your artwork or explore Pinterest-sourced inspiration, order custom apparel, posters and stickers, and track every stage on press.",
      },
    ],
  }),
  component: Home,
});

const MARQUEE = [
  "SCREEN PRINT",
  "EMBROIDERY",
  "RISOGRAPH",
  "DIE-CUT VINYL",
  "LETTERPRESS",
  "LARGE FORMAT",
];

function Home() {
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.listProducts() });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border paper-grain">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <RegistrationMark className="size-4" spin />
              <span className="text-receipt">Independent print studio</span>
            </div>
            <h1 className="text-display text-5xl font-bold sm:text-6xl lg:text-7xl">
              It&apos;s time
              <br />
              to <span className="text-accent">shine.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Bring artwork, a rough sketch or just an idea. We&apos;ll help shape it, press it
              properly, and show you every stage of the job as it happens.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/products">
                  Browse the catalogue <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/studio">
                  <Upload className="size-4" /> Upload artwork
                </Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                ["48h", "Rush turnaround"],
                ["1,400+", "Jobs pressed"],
                ["4.9", "Average rating"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-display text-2xl font-bold">{v}</dt>
                  <dd className="text-receipt mt-1 text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-lift">
              <img
                src={hero}
                alt="Freshly screen-printed shirts and posters drying in the AK studio"
                width={1600}
                height={1104}
                className="aspect-4/3 w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-press sm:block">
              <p className="text-receipt text-muted-foreground">Now on press</p>
              <p className="font-mono text-sm font-semibold">AK-4821 · 20 × tees</p>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden bg-primary py-3 text-primary-foreground">
        <div className="marquee-track flex w-max gap-10">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="text-receipt flex items-center gap-10 whitespace-nowrap">
              {m} <span className="text-accent">✳</span>
            </span>
          ))}
        </div>
      </div>

      {/* Three services */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="text-display text-3xl font-bold sm:text-4xl">Three ways in</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Everything the studio does sits behind one of these three doors.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Upload,
              title: "Order & design",
              body: "Pick a product, choose colours and placement, upload your file, and place the order in a couple of minutes.",
              to: "/studio",
              cta: "Open the Design Studio",
            },
            {
              icon: Sparkles,
              title: "Ask AK",
              body: "The studio assistant answers pricing, materials, artwork specs and turnaround questions — grounded in our own knowledge base.",
              to: "/assistant",
              cta: "Talk to the assistant",
            },
            {
              icon: Truck,
              title: "Track your job",
              body: "Six stamped stages from received to delivered, with a note at each hand-off, plus WhatsApp and email updates.",
              to: "/orders",
              cta: "See my orders",
            },
          ].map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <card.icon className="size-6 text-accent" />
              <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                {card.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Catalogue preview */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-display text-3xl font-bold sm:text-4xl">Popular right now</h2>
            <p className="mt-3 text-muted-foreground">Priced per piece, cheaper by the box.</p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/products">
              All products <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(products ?? []).slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-16 text-center text-primary-foreground">
          <RegistrationMark className="absolute -right-10 -top-10 size-48 opacity-20" />
          <h2 className="text-display text-4xl font-bold sm:text-5xl">Got a file? Let&apos;s press it.</h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
            Upload your artwork and get a quote back the same working hour.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/studio">Start a job</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground">
              <Link to="/assistant">
                <MessageCircle className="size-4" /> Ask a question first
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
