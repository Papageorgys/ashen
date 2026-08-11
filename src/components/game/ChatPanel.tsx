import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchChat, postChat, type ChatMessageRow } from "@/lib/cloud/sync";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { supabase } from "@/integrations/supabase/client";
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

export function ChatPanel({ signedIn, myId, clanName, leaderName, crest }: Props) {
  const [messages, setMessages] = useState<ChatMessageRow[] | null>(null);
  const [online, setOnline] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // The label we present to the hall — clan once founded, else the lord's name.
  const speaker = useMemo(
    () => clanName?.trim() || leaderName?.trim() || "A wanderer",
    [clanName, leaderName],
  );

  const append = (row: ChatMessageRow) =>
    setMessages((prev) => {
      const base = prev ?? [];
      if (base.some((m) => m.id === row.id)) return base; // our own echo, or a dup
      return [...base, row].slice(-MAX_MESSAGES);
    });

  // Load history, then keep a single realtime channel for new messages + presence.
  useEffect(() => {
    let live = true;
    fetchChat().then((rows) => live && setMessages(rows));

    const presenceKey = myId ?? `guest-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel("realm-hall", { config: { presence: { key: presenceKey } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          if (live) append(payload.new as unknown as ChatMessageRow);
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (live) setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ leaderName: leaderName ?? null, clanName: clanName ?? null });
        }
      });

    return () => {
      live = false;
      void supabase.removeChannel(channel);
    };
    // Re-subscribe only when the identity changes (rare); message flow is handled inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  // Stick to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !myId || sending) return;
    setSending(true);
    setDraft("");
    const row = await postChat(myId, body, { clanName, leaderName, crest });
    if (row) append(row);
    else setDraft(body); // failed — hand the words back
    setSending(false);
  };

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-gold">The Hall</h2>
          <p className="text-xs text-muted-foreground">
            Every clan in the Ashen Realm gathers here. Speak and be heard across the world in real
            time.
          </p>
        </div>
        <span className="plaque text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
          {online} in the hall
        </span>
      </header>

      <div className="panel flex h-[52vh] flex-col rounded-sm">
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
          {messages === null ? (
            <p className="text-xs text-muted-foreground">Listening at the door…</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              The hall is quiet. Be the first to raise your voice.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.user_id === myId;
              const name = m.clan_name?.trim() || m.leader_name?.trim() || "A wanderer";
              return (
                <article
                  key={m.id}
                  className={`flex items-start gap-2.5 rounded-sm px-2 py-1.5 ${
                    mine ? "bg-gold/10" : ""
                  }`}
                >
                  <ClanCrest
                    crest={(m.crest as Crest) ?? DEFAULT_CREST}
                    className="mt-0.5 h-7 w-7 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`truncate font-display text-xs ${mine ? "text-gold" : "text-foreground"}`}
                      >
                        {name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
                      {m.body}
                    </p>
                  </div>
                </article>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border/60 p-2.5">
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
                placeholder={`Speak as ${speaker}…`}
                aria-label="Message the hall"
                disabled={sending}
              />
              <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                Send
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Sign in to speak in the hall.</p>
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
