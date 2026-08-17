import { Flag, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import { bannerCap } from "@/lib/game/engine";

/** How a banner reads at a glance — a coloured dot and a word. */
function bannerStatus(p: GameState["parties"][number]): { label: string; tone: string } {
  if (p.run) return { label: "on the hunt", tone: "#7ea86a" };
  if (p.travel) return { label: "marching", tone: "#d8a24a" };
  if (p.memberIds.length === 0) return { label: "empty", tone: "#8a8375" };
  return { label: "at rest", tone: "#c9b06a" };
}

/**
 * Banners dock — a compact roster of your fielded banners, floated over the map's
 * bottom-left. The detail (assigning champions, raising banners) opens in a panel;
 * this is the glance-and-go status.
 */
export function BannerDock({ state, onManage }: { state: GameState; onManage: () => void }) {
  const slots = bannerCap(state);
  const parties = state.parties.slice(0, 6);
  return (
    <div className="pointer-events-auto absolute bottom-2 left-2 z-10 w-52 max-w-[46%] overflow-hidden rounded-sm border border-white/12 bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        onClick={onManage}
        className="flex w-full items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
        title="Manage banners and roster"
      >
        <span className="flex items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          <Flag className="h-3.5 w-3.5" aria-hidden />
          Banners
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {state.parties.length}/{slots}
        </span>
      </button>
      <ul className="max-h-40 divide-y divide-white/5 overflow-y-auto">
        {parties.map((p) => {
          const st = bannerStatus(p);
          return (
            <li key={p.id} className="flex items-center gap-2 px-2.5 py-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: st.tone }}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#e7d7ac]">{p.name}</span>
              <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                {p.memberIds.length}/5
              </span>
              <span className="hidden shrink-0 text-[9px] sm:inline" style={{ color: st.tone }}>
                {st.label}
              </span>
            </li>
          );
        })}
        {parties.length === 0 && (
          <li className="px-2.5 py-2 text-[10px] text-muted-foreground">
            No banners raised — open to muster one.
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Field Report dock — the freshest lines of the running chronicle, floated over
 * the map's top-right (yields to the realm codex when a territory is inspected).
 */
export function FeedDock({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const lines = state.log.slice(0, 5);
  const toneColor = (t: string) => (t === "good" ? "#7ea86a" : t === "bad" ? "#d1603a" : "#c9b8a0");
  return (
    <div className="pointer-events-auto absolute right-2 top-2 z-10 w-56 max-w-[52%] overflow-hidden rounded-sm border border-white/12 bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5 text-left font-display text-[11px] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-white/5"
        title="Open the full field report"
      >
        <ScrollText className="h-3.5 w-3.5" aria-hidden />
        Field Report
      </button>
      <ul className="max-h-36 space-y-1 overflow-y-auto px-2.5 py-1.5">
        {lines.map((l) => (
          <li
            key={l.id}
            className={cn("truncate text-[10px] leading-snug")}
            style={{ color: toneColor(l.tone) }}
            title={l.text}
          >
            {l.text}
          </li>
        ))}
        {lines.length === 0 && (
          <li className="text-[10px] text-muted-foreground">The realm is quiet.</li>
        )}
      </ul>
    </div>
  );
}
