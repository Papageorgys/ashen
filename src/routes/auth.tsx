import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Enter the Realm — Clan Leader" },
      {
        name: "description",
        content:
          "Sign in to carry your company across devices, claim your clan name on the realm ladder and stand among every other clan in the Ashen Realm.",
      },
      { property: "og:title", content: "Enter the Realm — Clan Leader" },
      {
        property: "og:description",
        content: "Sign in or raise a new banner in the Ashen Realm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Already sworn in? No need to linger at the gate.
  useEffect(() => {
    if (ready && user) void navigate({ to: "/" });
  }, [ready, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, my lord.");
        navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Your name is written in the rolls.");
          navigate({ to: "/" });
        } else {
          toast.success("Check your email to confirm your name.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return void toast.error("Google sign-in failed.");
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Banners of the</p>
        <h1 className="gilded font-display text-4xl">Ashen Realm</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The realm is open only to sworn lords. Sign in or raise a new banner to take the road,
          keep your company across devices and stand on the ladder beside every other clan.
        </p>
      </div>

      <form onSubmit={submit} className="panel space-y-3 rounded-sm p-4">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Email</span>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Password</span>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy} className="w-full">
          {mode === "in" ? "Sign in" : "Raise a new banner"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
        <button
          type="button"
          className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "No account yet? Create one." : "Already sworn? Sign in."}
        </button>
      </form>

      <Toaster />
    </main>
  );
}
