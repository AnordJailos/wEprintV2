import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Design Studio — Upload Your Artwork | AK Print Studio" },
      {
        name: "description",
        content:
          "Drop in a PNG, PDF, SVG or AI file, add print notes, and keep every design you've sent to the studio in one place.",
      },
      { property: "og:title", content: "Design Studio | AK Print Studio" },
      { property: "og:description", content: "Upload artwork and manage your design library." },
    ],
  }),
  component: Studio,
});

const SPECS = [
  ["Formats", "PNG · PDF · SVG · AI"],
  ["Resolution", "300 DPI at print size"],
  ["Colour", "CMYK or named spot colours"],
  ["Fonts", "Outlined / converted to paths"],
];

function Studio() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: designs } = useQuery({ queryKey: ["designs"], queryFn: api.listDesigns });

  const upload = async (file: File) => {
    setBusy(true);
    try {
      await api.uploadDesign(file, notes);
      toast.success(`${file.name} uploaded`);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["designs"] });
    } catch {
      toast.error("Upload failed. Check the file and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14">
      <h1 className="text-display text-4xl font-bold sm:text-5xl">Design Studio</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Send us the file. If it needs redrawing for press, we&apos;ll tell you before anything gets
        printed.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) upload(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-14 text-center transition-colors paper-grain",
              dragging ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.svg,.ai"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            {busy ? (
              <Loader2 className="size-8 animate-spin text-accent" />
            ) : (
              <FileUp className="size-8 text-accent" />
            )}
            <p className="mt-4 text-lg font-semibold">Drop your artwork here</p>
            <p className="text-receipt mt-2 text-muted-foreground">or click to browse · max 25MB</p>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Print notes: size on garment, colours, placement…"
            className="mt-4"
          />

          <h2 className="text-display mt-12 text-2xl font-bold">Your design library</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(designs ?? []).map((d) => (
              <div key={d.id} className="flex gap-4 rounded-xl border border-border bg-card p-3">
                <img
                  src={d.file_url}
                  alt={d.file_name}
                  loading="lazy"
                  className="size-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium">{d.file_name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.notes}</p>
                  <p className="text-receipt mt-2 text-muted-foreground">
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${d.file_name}`}
                  onClick={async () => {
                    await api.deleteDesign(d.id);
                    toast.success("Design removed");
                    qc.invalidateQueries({ queryKey: ["designs"] });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-display text-xl font-bold">Artwork specs</h2>
          <dl className="mt-5 space-y-4">
            {SPECS.map(([k, v]) => (
              <div key={k} className="border-b border-border pb-4 last:border-0">
                <dt className="text-receipt text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            No file yet? Pull a direction from the Inspiration board and we&apos;ll draw from there.
          </p>
        </aside>
      </div>
    </div>
  );
}
