import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquare, ChevronDown, X } from "lucide-react";
import { fetchChat, postChat, type ChatChannel, type ChatMessageRow } from "@/lib/cloud/sync";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  signedIn: boolean;
  myId?: string | null;
  clanName?: string;
  leaderName?: string;
  crest?: Crest | null;
};

const MAX_MESSAGES = 200;

/** The named reaches a soul can call into — pick one to hear who's close. */
const REGIONS: { id: string; name: string }[] = [
  { id: "havenreach", name: "Havenreach" },
  { id: "greymarket", name: "Greymarket" },
  { id: "emberwatch", name: "Emberwatch" },
  { id: "coldspire", name: "Coldspire" },
  { id: "ravenhold", name: "Ravenhold" },
];

/** Each plane a voice can travel on, with its own lore and colour. */
const CHANNELS: Record<
  ChatChannel,
  { label: string; sub: string; text: string; border: string; dot: string; ring: string }
> = {
  world: {
    label: "The Veil",
    sub: "voices carried across the whole realm",
    text: "text-gold",
    border: "border-gold/60",
    dot: "bg-gold",
    ring: "ring-gold/40",
  },
  near: {
    label: "The Near Reaches",
    sub: "souls close at hand",
    text: "text-grade-c",
    border: "border-grade-c/60",
    dot: "bg-grade-c",
    ring: "ring-grade-c/40",
  },
};

function readFlag(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

function soulColor(m: ChatMessageRow): string {
  const c = m.crest as Crest | null;
  return c?.accent || DEFAULT_CREST.accent;
}

export function ChatDock({ signedIn, myId, clanName, leaderName, crest }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(() => readFlag("chat-open", "0") === "1");
  const [channel, setChannel] = useState<ChatChannel>("world");
  const [region, setRegion] = useState(() => readFlag("chat-region", REGIONS[0]!.id));
  const [world, setWorld] = useState<ChatMessageRow[] | null>(null);
  const [near, setNear] = useState<Record<string, ChatMessageRow[]>>({});
  const [online, setOnline] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => window.localStorage.setItem("chat-open", open ? "1" : "0"), [open]);
  useEffect(() => window.localStorage.setItem("chat-region", region), [region]);

  const speaker = useMemo(
    () => clanName?.trim() || leaderName?.trim() || "A wanderer",
    [clanName, leaderName],
  );

  // One realtime channel carries presence + every insert; we bucket by plane.
  useEffect(() => {
    let live = true;
    const key = myId ?? `guest-${Math.random().toString(36).slice(2)}`;
    const push = (arr: ChatMessageRow[], row: ChatMessageRow) =>
      arr.some((m) => m.id === row.id) ? arr : [...arr, row].slice(-MAX_MESSAGES);

    const ch = supabase
      .channel("veil-realm", { config: { presence: { key } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          if (!live) return;
          const row = payload.new as unknown as ChatMessageRow;
          if (row.channel === "near") {
            if (!row.region) return;
            setNear((prev) => ({ ...prev, [row.region!]: push(prev[row.region!] ?? [], row) }));
          } else {
            setWorld((prev) => push(prev ?? [], row));
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (live) setOnline(Object.keys(ch.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ userId: myId ?? null, leaderName: leaderName ?? null });
        }
      });

    return () => {
      live = false;
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  // Load history for whichever view is showing (once per region).
  useEffect(() => {
    let live = true;
    if (channel === "world") {
      if (world === null) fetchChat({ channel: "world" }).then((r) => live && setWorld(r));
    } else if (near[region] === undefined) {
      fetchChat({ channel: "near", region }).then(
        (r) => live && setNear((prev) => ({ ...prev, [region]: r })),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, region]);

  const messages = channel === "world" ? world : (near[region] ?? null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, channel, region]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !myId || sending) return;
    setSending(true);
    setDraft("");
    const row = await postChat(
      myId,
      body,
      { clanName, leaderName, crest },
      { channel, region: channel === "near" ? region : null },
    );
    if (row) {
      if (row.channel === "near" && row.region) {
        setNear((prev) => ({
          ...prev,
          [row.region!]: [...(prev[row.region!] ?? []), row].slice(-MAX_MESSAGES),
        }));
      } else {
        setWorld((prev) => [...(prev ?? []), row].slice(-MAX_MESSAGES));
      }
    } else {
      setDraft(body); // hand the words back
    }
    setSending(false);
  };

  const theme = CHANNELS[channel];

  // Collapsed: a single summoning bar / button.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the soul channels"
        className={`panel-ornate fixed z-40 flex items-center gap-2 rounded-sm border px-3 py-2 text-xs shadow-lg backdrop-blur ${theme.border} ${
          isMobile ? "bottom-20 right-3" : "bottom-3 right-3"
        }`}
      >
        <MessagesSquare className={`h-4 w-4 ${theme.text}`} aria-hidden />
        <span className={`font-display ${theme.text}`}>{theme.label}</span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${theme.dot}`} />
          {online}
        </span>
      </button>
    );
  }

  return (
    <section
      className={`panel-ornate fixed z-40 flex flex-col rounded-sm border shadow-2xl backdrop-blur ${theme.border} ${
        isMobile ? "inset-x-0 bottom-0 top-16 rounded-none" : "bottom-3 right-3 h-[60vh] w-[23rem]"
      }`}
      aria-label="Soul channels"
    >
      {/* channel selector */}
      <header className="flex items-center gap-1 border-b border-border/60 p-2">
        {(Object.keys(CHANNELS) as ChatChannel[]).map((key) => {
          const c = CHANNELS[key];
          const active = key === channel;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              className={`rounded-sm border px-2 py-1 text-left transition ${
                active ? `${c.border} bg-background/50` : "border-transparent hover:border-border"
              }`}
            >
              <span
                className={`block font-display text-xs ${active ? c.text : "text-muted-foreground"}`}
              >
                {c.label}
              </span>
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${theme.dot}`} />
          {online} in the veil
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close the soul channels"
          className="ml-1 rounded-sm p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4 md:hidden" aria-hidden />
          <X className="hidden h-4 w-4 md:block" aria-hidden />
        </button>
      </header>

      {/* sub-line + region picker (near only) */}
      <div className="flex items-center gap-2 border-b border-border/40 px-2.5 py-1.5">
        <p className="truncate text-[10px] italic text-muted-foreground">{theme.sub}</p>
        {channel === "near" && (
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="Choose a reach"
            className="ml-auto rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[11px] text-foreground"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
        {messages === null ? (
          <p className="text-xs text-muted-foreground">Listening across the veil…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {channel === "near"
              ? "No souls stirring in this reach. Be the first."
              : "The veil is silent. Raise your voice."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === myId;
            const name = m.clan_name?.trim() || m.leader_name?.trim() || "A wanderer";
            return (
              <article
                key={m.id}
                className={`flex items-start gap-2 rounded-sm px-1.5 py-1 ${mine ? "bg-background/40" : ""}`}
              >
                <ClanCrest
                  crest={(m.crest as Crest) ?? DEFAULT_CREST}
                  className="mt-0.5 h-6 w-6 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="truncate font-display text-[11px]"
                      style={{ color: soulColor(m) }}
                    >
                      {name}
                    </span>
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground/90">
                    {m.body}
                  </p>
                </div>
              </article>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-border/60 p-2">
        {signedIn ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder={
                channel === "near"
                  ? `Speak to ${REGIONS.find((r) => r.id === region)?.name ?? "the reach"} as ${speaker}…`
                  : `Speak across the veil as ${speaker}…`
              }
              aria-label="Send your voice"
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
              Speak
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">Sign in to lend your voice.</p>
        )}
      </div>
    </section>
  );
}
