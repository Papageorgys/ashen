import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setRememberSession } from "@/integrations/supabase/auth-storage";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ashen Legacy — Enter the Realm" },
      {
        name: "description",
        content:
          "Sign in to carry your company across devices, claim your clan name on the realm ladder and stand among every other clan in Aethyr.",
      },
      { property: "og:title", content: "Ashen Legacy — Enter the Realm" },
      {
        property: "og:description",
        content: "Sign in or raise a new banner in Aethyr.",
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
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "bad" | "info"; text: string } | null>(null);

  // Already sworn in? No need to linger at the gate.
  useEffect(() => {
    if (ready && user) void navigate({ to: "/" });
  }, [ready, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    // Honour the "remember me" choice before the session is written.
    setRememberSession(remember);
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
          // No session means the project requires email confirmation first.
          setMode("in");
          setNotice({
            tone: "info",
            text: `Your name is recorded. We sent a confirmation link to ${email} — confirm it, then sign in.`,
          });
          toast.success("Check your email to confirm your name.");
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "That did not work.";
      setNotice({ tone: "bad", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setRememberSession(remember);
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
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The war for Aethyr</p>
        <h1 className="gilded font-display text-4xl">Ashen Legacy</h1>
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
        <label className="flex cursor-pointer items-center gap-2 pt-0.5">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            aria-label="Keep me signed in on this device"
          />
          <span className="text-xs text-muted-foreground">Keep me signed in on this device</span>
        </label>
        {notice && (
          <p
            className={`text-xs ${notice.tone === "bad" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {notice.text}
          </p>
        )}
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
