import { ORDER_STAGES, type OrderStatus } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * The order lifecycle as a row of rubber stamps being inked in sequence,
 * instead of a generic progress bar.
 */
export function StatusStamp({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  const reached = ORDER_STAGES.findIndex((s) => s.status === status);

  return (
    <ol className={cn("flex flex-wrap items-start", compact ? "gap-2" : "gap-3 sm:gap-5")}>
      {ORDER_STAGES.map((stage, i) => {
        const done = i < reached;
        const current = i === reached;
        return (
          <li key={stage.status} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "grid place-items-center rounded-full border-2 border-dashed transition-all duration-300",
                compact ? "size-8" : "size-14",
                done && "border-success bg-success/10 text-success border-solid",
                current && "border-accent bg-accent text-accent-foreground border-solid ink-in shadow-lift",
                !done && !current && "border-border text-muted-foreground/50",
              )}
              style={current ? { transform: "rotate(-4deg)" } : undefined}
            >
              {done ? (
                <Check className={compact ? "size-3.5" : "size-5"} strokeWidth={3} />
              ) : (
                <span className={cn("font-mono font-bold", compact ? "text-[10px]" : "text-sm")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
            </div>
            {!compact && (
              <span
                className={cn(
                  "text-receipt text-center",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const stage = ORDER_STAGES.find((s) => s.status === status);
  const tone =
    status === "delivered"
      ? "bg-success/12 text-success border-success/30"
      : status === "pending"
        ? "bg-muted text-muted-foreground border-border"
        : "bg-accent/12 text-accent border-accent/30";
  return (
    <span className={cn("text-receipt inline-flex items-center rounded-full border px-3 py-1", tone)}>
      {stage?.label ?? status}
    </span>
  );
}
