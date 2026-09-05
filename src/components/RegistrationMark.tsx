import { cn } from "@/lib/utils";

/**
 * The print registration mark — the crosshair printers use to align colour
 * plates. Used in exactly two places: the nav logo and the homepage hero.
 */
export function RegistrationMark({
  className,
  spin = false,
}: {
  className?: string;
  spin?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("text-accent", spin && "animate-[spin_18s_linear_infinite]", className)}
    >
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path d="M24 1v14M24 33v14M1 24h14M33 24h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
