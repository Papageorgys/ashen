import type { AnnalEntry, AnnalKind } from "@/lib/realm/annals";
import type { Ruler } from "@/lib/realm/dynasty";
import { rulerStyle } from "@/lib/realm/dynasty";
import type { World } from "@/lib/realm/types";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

const KIND_ICON: Record<AnnalKind, IconName> = {
  conquest: "swords",
  war: "banner",
  peace: "scroll",
  succession: "crown",
  founding: "home",
};
const KIND_COLOR: Record<AnnalKind, string> = {
  conquest: "#e0895f",
  war: "#d1603a",
  peace: "#9cc487",
  succession: "#c9a13f",
  founding: "#b9a8e6",
};

/**
 * The Annals — the realm's living history and the crowns that shape it. The
 * present roll of rulers above; the deeds of years past below.
 */
export function AnnalsPanel({
  world,
  rulers,
  annals,
  onClose,
}: {
  world: World;
  rulers: Record<string, Ruler>;
  annals: AnnalEntry[];
  onClose: () => void;
}) {
  const entries = annals.slice().reverse();
  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            The world remembers
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Annals</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="stage-scroll flex-1 overflow-y-auto p-3">
        {/* the crowns of the age */}
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          The crowns of the age
        </div>
        <div className="mt-1.5 space-y-1">
          {world.kingdoms.map((k) => {
            const ru = rulers[k.id];
            if (!ru) return null;
            return (
              <div
                key={k.id}
                className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5"
              >
                <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: k.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-gold">{rulerStyle(ru)}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    of {k.name} · age {ru.age} · {ru.traits.join(", ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* the chronicle of deeds */}
        <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Deeds of the realm
        </div>
        <ul className="mt-1.5 space-y-1">
          {entries.map((e, i) => (
            <li
              key={`${e.day}-${i}`}
              className="flex items-start gap-2 rounded-sm px-1.5 py-1 text-[12px] leading-snug"
            >
              <span className="mt-[2px] shrink-0" style={{ color: KIND_COLOR[e.kind] }}>
                <GameIcon name={KIND_ICON[e.kind]} size={12} />
              </span>
              <span className="text-muted-foreground">
                <span className="tabular-nums text-[#c9b06a]">Year {e.year}. </span>
                <span className="text-[#e7d7ac]">{e.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
