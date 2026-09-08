import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { RegistrationMark } from "@/components/RegistrationMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, IS_DEMO, setSession } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create an Account | AK Print Studio" },
      {
        name: "description",
        content:
          "Create an AK Print Studio account to upload artwork, place custom print orders and track every job to delivery.",
      },
      { property: "og:title", content: "Sign In | AK Print Studio" },
      { property: "og:description", content: "Access your designs, orders and job tracking." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = mode === "login" ? await api.login(form) : await api.register(form);
      setSession(res.token, res.user);
      toast.success(`Welcome${res.user.name ? `, ${res.user.name.split(" ")[0]}` : ""}`);
      navigate({ to: res.user.role === "admin" ? "/admin" : "/orders" });
    } catch {
      toast.error("Those details didn't work. Please check and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-md px-5 py-20">
      <div className="text-center">
        <RegistrationMark className="mx-auto size-10" />
        <h1 className="text-display mt-5 text-3xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to see your designs and orders."
            : "One account for artwork, orders and tracking."}
        </p>
      </div>

      <div className="mt-8 flex rounded-full border border-border p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "login" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
        {mode === "login" && (
          <button
            type="button"
            className="text-receipt w-full text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const r = await api.forgotPassword(form.email);
              toast.info(r.message);
            }}
          >
            Forgot password?
          </button>
        )}
      </form>

      {IS_DEMO && (
        <p className="text-receipt mt-8 rounded-lg bg-secondary p-4 text-center text-muted-foreground">
          Demo mode: any email works. Use one starting with <span className="text-accent">admin</span>
          to enter the admin console.
        </p>
      )}
    </div>
  );
}
