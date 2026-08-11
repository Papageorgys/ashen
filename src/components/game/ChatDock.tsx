import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquare, ChevronDown, X, ArrowLeft } from "lucide-react";
import {
  fetchChat,
  postChat,
  fetchLadder,
  fetchDMThread,
  postDM,
  type ChatChannel,
  type ChatMessageRow,
  type DirectMessageRow,
  type LadderRow,
} from "@/lib/cloud/sync";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { regionForZone } from "@/lib/game/data";
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
  /** the zone your lead banner is in — the Near Reaches follows it unless pinned */
  leadZoneId?: string | null;
};

type View = "world" | "near" | "soul";

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
const VIEWS: Record<
  View,
  { label: string; sub: string; text: string; border: string; dot: string }
> = {
  world: {
    label: "The Veil",
    sub: "voices carried across the whole realm",
    text: "text-gold",
    border: "border-gold/60",
    dot: "bg-gold",
  },
  near: {
    label: "The Near Reaches",
    sub: "souls close at hand",
    text: "text-grade-c",
    border: "border-grade-c/60",
    dot: "bg-grade-c",
  },
  soul: {
    label: "Soulthread",
    sub: "one soul reaching another, alone",
    text: "text-grade-a",
    border: "border-grade-a/60",
    dot: "bg-grade-a",
  },
};

function readFlag(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

function accentOf(crest: unknown): string {
  const c = crest as Crest | null;
  return c?.accent || DEFAULT_CREST.accent;
}

export function ChatDock({ signedIn, myId, clanName, leaderName, crest, leadZoneId }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(() => readFlag("chat-open", "0") === "1");
  const [view, setView] = useState<View>("world");
  const [region, setRegion] = useState(() => readFlag("chat-region", REGIONS[0]!.id));
  // The Near Reaches follows your lead banner's zone until you pin a reach by hand.
  const [pinned, setPinned] = useState(() => readFlag("chat-region-pinned", "0") === "1");
  const autoRegion = leadZoneId ? regionForZone(leadZoneId) : null;

  // public channels
  const [world, setWorld] = useState<ChatMessageRow[] | null>(null);
  const [near, setNear] = useState<Record<string, ChatMessageRow[]>>({});
  const [online, setOnline] = useState(0);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  // soulthread
  const [directory, setDirectory] = useState<LadderRow[]>([]);
  const [dmWith, setDmWith] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, DirectMessageRow[]>>({});
  const [soulUnread, setSoulUnread] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // refs so the realtime callbacks read the latest view/partner without re-subscribing
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const dmWithRef = useRef<string | null>(dmWith);
  dmWithRef.current = dmWith;

  useEffect(() => window.localStorage.setItem("chat-open", open ? "1" : "0"), [open]);
  useEffect(() => window.localStorage.setItem("chat-region", region), [region]);
  useEffect(() => window.localStorage.setItem("chat-region-pinned", pinned ? "1" : "0"), [pinned]);
  // Follow the banner unless the player has pinned a reach.
  useEffect(() => {
    if (!pinned && autoRegion && autoRegion !== region) setRegion(autoRegion);
  }, [pinned, autoRegion, region]);

  const speaker = useMemo(
    () => clanName?.trim() || leaderName?.trim() || "A wanderer",
    [clanName, leaderName],
  );

  // Realtime: the public veil (presence + channel inserts) and a private soulthread.
  useEffect(() => {
    let live = true;
    const key = myId ?? `guest-${Math.random().toString(36).slice(2)}`;
    const push = <T extends { id: string }>(arr: T[], row: T) =>
      arr.some((m) => m.id === row.id) ? arr : [...arr, row].slice(-MAX_MESSAGES);

    const veil = supabase
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
        if (!live) return;
        const ids = Object.keys(veil.presenceState());
        setOnline(ids.length);
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await veil.track({ userId: myId ?? null, leaderName: leaderName ?? null });
        }
      });

    // Private whispers — RLS delivers only rows where I am sender or recipient.
    const thread = supabase
      .channel(`soulthread-${key}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          if (!live || !myId) return;
          const row = payload.new as unknown as DirectMessageRow;
          const other = row.sender_id === myId ? row.recipient_id : row.sender_id;
          setThreads((prev) => ({ ...prev, [other]: push(prev[other] ?? [], row) }));
          const looking = viewRef.current === "soul" && dmWithRef.current === other;
          if (!looking && row.sender_id !== myId) setSoulUnread(true);
        },
      )
      .subscribe();

    return () => {
      live = false;
      void supabase.removeChannel(veil);
      void supabase.removeChannel(thread);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  // Load public history for the showing view (once per region).
  useEffect(() => {
    let live = true;
    if (view === "world") {
      if (world === null) fetchChat({ channel: "world" }).then((r) => live && setWorld(r));
    } else if (view === "near" && near[region] === undefined) {
      fetchChat({ channel: "near", region }).then(
        (r) => live && setNear((prev) => ({ ...prev, [region]: r })),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, region]);

  // Entering the Soulthread: clear the unread mark and load the directory of souls.
  useEffect(() => {
    if (view !== "soul") return;
    setSoulUnread(false);
    if (directory.length === 0) fetchLadder().then(setDirectory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Load a whisper thread when one is opened.
  useEffect(() => {
    let live = true;
    if (view === "soul" && dmWith && myId && threads[dmWith] === undefined) {
      fetchDMThread(myId, dmWith).then((r) => live && setThreads((p) => ({ ...p, [dmWith]: r })));
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dmWith]);

  // The souls a player can whisper: everyone on the ladder plus anyone already in a thread.
  const partners = useMemo(() => {
    const map = new Map<string, { id: string; name: string; crest: unknown }>();
    for (const r of directory) {
      if (r.user_id === myId) continue;
      map.set(r.user_id, {
        id: r.user_id,
        name: r.clan_name || r.leader_name || "A soul",
        crest: r.crest,
      });
    }
    for (const [oid, msgs] of Object.entries(threads)) {
      if (oid === myId || map.has(oid)) continue;
      const m = msgs.find((x) => x.sender_id === oid);
      map.set(oid, {
        id: oid,
        name: m?.sender_clan_name || m?.sender_leader_name || "A soul",
        crest: m?.crest ?? null,
      });
    }
    return [...map.values()];
  }, [directory, threads, myId]);

  const publicMessages = view === "world" ? world : view === "near" ? (near[region] ?? null) : null;
  const dmMessages = view === "soul" && dmWith ? (threads[dmWith] ?? null) : null;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [publicMessages, dmMessages, open, view, region, dmWith]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !myId || sending) return;
    if (view === "soul" && !dmWith) return;
    setSending(true);
    setDraft("");
    const who = { clanName, leaderName, crest };
    if (view === "soul" && dmWith) {
      const row = await postDM(myId, dmWith, body, who);
      if (row)
        setThreads((p) => ({ ...p, [dmWith]: [...(p[dmWith] ?? []), row].slice(-MAX_MESSAGES) }));
      else setDraft(body);
    } else {
      const channel = view as ChatChannel;
      const row = await postChat(myId, body, who, {
        channel,
        region: channel === "near" ? region : null,
      });
      if (row) {
        if (row.channel === "near" && row.region) {
          setNear((p) => ({
            ...p,
            [row.region!]: [...(p[row.region!] ?? []), row].slice(-MAX_MESSAGES),
          }));
        } else {
          setWorld((p) => [...(p ?? []), row].slice(-MAX_MESSAGES));
        }
      } else {
        setDraft(body);
      }
    }
    setSending(false);
  };

  const theme = VIEWS[view];
  const partnerName = dmWith ? (partners.find((p) => p.id === dmWith)?.name ?? "a soul") : "";

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
        {soulUnread && (
          <span className="h-1.5 w-1.5 rounded-full bg-grade-a" aria-label="new whisper" />
        )}
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
      <header className="flex items-center gap-1 border-b border-border/60 p-2">
        {(Object.keys(VIEWS) as View[]).map((key) => {
          const c = VIEWS[key];
          const active = key === view;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`relative rounded-sm border px-2 py-1 transition ${
                active ? `${c.border} bg-background/50` : "border-transparent hover:border-border"
              }`}
            >
              <span
                className={`block font-display text-xs ${active ? c.text : "text-muted-foreground"}`}
              >
                {c.label}
              </span>
              {key === "soul" && soulUnread && !active && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-grade-a" />
              )}
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${theme.dot}`} />
          {online}
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

      <div className="flex items-center gap-2 border-b border-border/40 px-2.5 py-1.5">
        {view === "soul" && dmWith ? (
          <button
            type="button"
            onClick={() => setDmWith(null)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> {partnerName}
          </button>
        ) : (
          <p className="truncate text-[10px] italic text-muted-foreground">{theme.sub}</p>
        )}
        {view === "near" && (
          <div className="ml-auto flex items-center gap-1">
            {pinned && autoRegion ? (
              <button
                type="button"
                onClick={() => setPinned(false)}
                title="Follow your banner"
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-grade-c"
              >
                follow
              </button>
            ) : autoRegion ? (
              <span
                className="text-[9px] uppercase tracking-widest text-grade-c"
                title="Following your lead banner"
              >
                ⚑ here
              </span>
            ) : null}
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setPinned(true);
              }}
              aria-label="Choose a reach"
              className="rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[11px] text-foreground"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
        {view === "soul" && !dmWith ? (
          <SoulPicker partners={partners} onlineIds={onlineIds} onPick={setDmWith} />
        ) : view === "soul" ? (
          <MessageList
            rows={(dmMessages ?? []).map((m) => ({
              id: m.id,
              userId: m.sender_id,
              name: m.sender_clan_name?.trim() || m.sender_leader_name?.trim() || "A soul",
              crest: m.crest,
              body: m.body,
              at: m.created_at,
            }))}
            loaded={dmMessages !== null}
            myId={myId}
            empty="No words yet. Reach out."
          />
        ) : (
          <MessageList
            rows={(publicMessages ?? []).map((m) => ({
              id: m.id,
              userId: m.user_id,
              name: m.clan_name?.trim() || m.leader_name?.trim() || "A wanderer",
              crest: m.crest,
              body: m.body,
              at: m.created_at,
            }))}
            loaded={publicMessages !== null}
            myId={myId}
            empty={
              view === "near"
                ? "No souls stirring in this reach. Be the first."
                : "The veil is silent. Raise your voice."
            }
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-border/60 p-2">
        {!signedIn ? (
          <p className="text-xs text-muted-foreground">Sign in to lend your voice.</p>
        ) : view === "soul" && !dmWith ? (
          <p className="text-xs text-muted-foreground">Choose a soul to whisper to.</p>
        ) : (
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
                view === "soul"
                  ? `Whisper to ${partnerName}…`
                  : view === "near"
                    ? `Speak to ${REGIONS.find((r) => r.id === region)?.name ?? "the reach"} as ${speaker}…`
                    : `Speak across the veil as ${speaker}…`
              }
              aria-label="Send your voice"
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
              {view === "soul" ? "Whisper" : "Speak"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function SoulPicker({
  partners,
  onlineIds,
  onPick,
}: {
  partners: { id: string; name: string; crest: unknown }[];
  onlineIds: string[];
  onPick: (id: string) => void;
}) {
  const online = new Set(onlineIds);
  if (partners.length === 0) {
    return <p className="text-xs text-muted-foreground">No other souls known yet.</p>;
  }
  const sorted = [...partners].sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)));
  return (
    <div className="grid gap-1">
      {sorted.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          className="flex items-center gap-2 rounded-sm border border-transparent px-1.5 py-1 text-left hover:border-grade-a/50"
        >
          <ClanCrest crest={(p.crest as Crest) ?? DEFAULT_CREST} className="h-6 w-6 shrink-0" />
          <span
            className="min-w-0 flex-1 truncate text-[13px] text-foreground"
            style={{ color: accentOf(p.crest) }}
          >
            {p.name}
          </span>
          {online.has(p.id) && (
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-grade-c">
              <span className="h-1.5 w-1.5 rounded-full bg-grade-c" /> here
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function MessageList({
  rows,
  loaded,
  myId,
  empty,
}: {
  rows: { id: string; userId: string; name: string; crest: unknown; body: string; at: string }[];
  loaded: boolean;
  myId?: string | null | undefined;
  empty: string;
}) {
  if (!loaded) return <p className="text-xs text-muted-foreground">Listening across the veil…</p>;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <>
      {rows.map((m) => {
        const mine = m.userId === myId;
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
                  style={{ color: accentOf(m.crest) }}
                >
                  {m.name}
                </span>
                <span className="shrink-0 text-[9px] text-muted-foreground">
                  {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground/90">
                {m.body}
              </p>
            </div>
          </article>
        );
      })}
    </>
  );
}
