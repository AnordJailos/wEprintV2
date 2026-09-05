import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, ShieldCheck, UserRound } from "lucide-react";
import logo from "@/assets/ak-logo.png";
import { RegistrationMark } from "./RegistrationMark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearSession, getUser, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/products", label: "Shop" },
  { to: "/studio", label: "Design Studio" },
  { to: "/inspiration", label: "Inspiration" },
  { to: "/orders", label: "My Orders" },
  { to: "/assistant", label: "Ask AK" },
];

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("ak-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ak-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <RegistrationMark className="size-6" />
          <span className="text-display text-xl font-bold">AK</span>
          <span className="text-receipt hidden text-muted-foreground sm:block">Print Studio</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                path.startsWith(item.to)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user?.role === "admin" && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">
                <ShieldCheck className="size-4" /> Admin
              </Link>
            </Button>
          )}
          {user ? (
            <>
              <span className="text-receipt hidden text-muted-foreground md:inline">{user.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSession();
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">
                <UserRound className="size-4" /> Sign in
              </Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-10 flex flex-col gap-1">
                {[...NAV, { to: "/admin", label: "Admin" }].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="text-display rounded-lg px-3 py-3 text-2xl font-semibold hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src={logo} alt="AK Print Studio logo" width={64} height={64} loading="lazy" className="mb-4 size-14 invert" />
          <p className="text-display text-2xl font-bold">It&apos;s time to shine.</p>
          <p className="mt-3 max-w-sm text-sm text-primary-foreground/70">
            Custom printing, designed with you and pressed in-house. Apparel, posters, stickers,
            stationery and signage.
          </p>
        </div>
        <div>
          <p className="text-receipt text-primary-foreground/60">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-primary-foreground/80 hover:text-primary-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-receipt text-primary-foreground/60">Studio</p>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li>Mon–Fri · 08:00–17:00</li>
            <li>hello@akprint.studio</li>
            <li>WhatsApp orders welcome</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-5 text-center">
        <p className="text-receipt text-primary-foreground/50">© 2026 AK Print Studio</p>
      </div>
    </footer>
  );
}
