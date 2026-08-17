import { useMemo } from "react";
import {
  deedsFromState,
  renownScore,
  renownRank,
  inscribeCost,
  CLAN_TITLES,
  earnedTitles,
  DEED_LABEL,
  canAscend,
  ascensionYield,
  type DeedClass,
  type GameState,
} from "@/lib/game/engine";
import { LEGACY_BOONS, LEGACY_BOON_IDS, type LegacyBoonId } from "@/lib/game/legacy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Legacy — the only victory (Systems Bible §7). The clan's Deeds, read from the
 * permanent Chronicle; a cosmetic Renown rank derived from them (never a stat,
 * §7.5); and Inscription — carving a Deed into the Founders' Monument for a price
 * in gold. Nothing here grants power. It grants remembrance.
 */

const CLASS_TONE: Record<DeedClass, string> = {
  conquest: "text-emerald-400 border-emerald-400/40",
  endurance: "text-sky-300 border-sky-300/40",
  first: "text-gold border-gold/40",
  sacrifice: "text-destructive border-destructive/40",
  craft: "text-amber-300 border-amber-300/40",
  infamy: "text-fuchsia-300 border-fuchsia-300/40",
};

function when(at: number) {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LegacyPanel({
  state,
  api,
}: {
  state: GameState;
  api: {
    inscribeDeed: (id: string) => void;
    declareReckoning: () => void;
    wearTitle: (titleId: string | null) => void;
    ascend: () => void;
    purchaseBoon: (id: LegacyBoonId) => void;
  };
}) {
  const legacy = state.legacy;
  const ascendGate = canAscend(state);
  const willEarn = ascensionYield(state);
  const deeds = useMemo(() => deedsFromState(state), [state]);
  const score = renownScore(deeds);
  const rank = renownRank(score);
  const inscribed = new Set(state.inscribed ?? []);
  const earned = useMemo(() => new Set(earnedTitles(state).map((t) => t.id)), [state]);

  const span = rank.next ? rank.next.at - rank.floor : 1;
  const into = Math.min(1, Math.max(0, (score - rank.floor) / span));

  return (
    <div className="space-y-4">
      {/* ------------------------------- ascension ----------------------------- */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              The Ashen Legacy · {legacy?.ascensions ?? 0} ascension
              {(legacy?.ascensions ?? 0) === 1 ? "" : "s"}
            </div>
            <h2 className="gilded font-display text-2xl">Pass into Legacy</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              At the pinnacle, let the house ascend: the run resets, but its deeds endure as
              permanent boons — and each climb begins from higher ground.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums text-[#b9a8e6]">
              {legacy?.points ?? 0}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              legacy to spend
            </div>
          </div>
        </div>

        <button
          type="button"
          data-sfx="levelup"
          disabled={!ascendGate.ok}
          onClick={() => {
            if (window.confirm(`Ascend now? This resets the run and earns ${willEarn} Legacy.`))
              api.ascend();
          }}
          title={ascendGate.ok ? `Earn ${willEarn} Legacy` : ascendGate.why}
          className="mt-3 w-full rounded-sm border border-[#7c5cff]/60 bg-[#7c5cff]/15 py-2 font-display text-xs uppercase tracking-[0.14em] text-[#c9bbe8] transition enabled:hover:bg-[#7c5cff]/25 disabled:opacity-40"
        >
          {ascendGate.ok ? `Ascend — earn ${willEarn} Legacy` : ascendGate.why}
        </button>

        {/* the boon tree — permanent, carried across every ascension */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {LEGACY_BOON_IDS.map((id) => {
            const def = LEGACY_BOONS[id];
            const have = legacy?.boons?.[id] ?? 0;
            const maxed = have >= def.maxLevel;
            const cost = def.cost(have);
            const afford = (legacy?.points ?? 0) >= cost;
            return (
              <div
                key={id}
                className={cn(
                  "rounded-sm border p-2.5",
                  maxed ? "border-gold/40 bg-gold/[0.05]" : "border-border/60 bg-black/20",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border border-white/10 bg-black/40 text-sm"
                  >
                    {def.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-sm text-gold">{def.name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {have}/{def.maxLevel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {def.blurb}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={maxed || !afford}
                  onClick={() => api.purchaseBoon(id)}
                  className="mt-2 w-full rounded-sm border border-[#7c5cff]/50 bg-[#7c5cff]/10 py-1 text-[11px] uppercase tracking-[0.1em] text-[#c9bbe8] transition enabled:hover:bg-[#7c5cff]/20 disabled:opacity-40"
                >
                  {maxed ? "Fully attuned" : `Attune · ${cost} legacy`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* --------------------------------- renown ------------------------------ */}
      <section className="panel rounded-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Renown — prestige, never power · Season of Ash {state.season ?? 1}
            </div>
            <h2 className="font-display text-2xl text-gold">{rank.title}</h2>
            <p className="text-xs text-muted-foreground">
              {deeds.length} deed{deeds.length === 1 ? "" : "s"} in the Chronicle · {inscribed.size}{" "}
              carved in stone
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums text-foreground">{score}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              renown
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-sm border border-border/60 bg-secondary">
            <div className="h-full bg-gold/70 transition-all" style={{ width: `${into * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {rank.next
              ? `${rank.next.at - score} renown until “${rank.next.title}.”`
              : "The highest renown in the realm. Your name will not be forgotten."}
          </p>
        </div>
      </section>

      {/* ------------------------------ worn titles ---------------------------- */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg text-gold">Titles</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            worn beside your name · never a stat
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Earn honorifics by Renown and by Deeds, then choose which the clan wears.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {CLAN_TITLES.map((t) => {
            const has = earned.has(t.id);
            const worn = state.title === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!has}
                onClick={() => api.wearTitle(worn ? null : t.id)}
                className={`rounded-sm border p-2 text-left transition ${
                  worn
                    ? "border-gold/60 bg-gold/10"
                    : has
                      ? "border-border/60 hover:border-gold/50"
                      : "border-border/40 opacity-50"
                }`}
                title={has ? (worn ? "Worn — click to remove" : "Click to wear") : t.desc}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-display text-sm ${worn ? "text-gold" : "text-foreground"}`}
                  >
                    “{t.title}”
                  </span>
                  {worn ? (
                    <span className="text-[9px] uppercase tracking-widest text-gold">worn</span>
                  ) : has ? (
                    <span className="text-[9px] uppercase tracking-widest text-emerald-400">
                      earned
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      locked
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* --------------------------------- deeds ------------------------------- */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg text-gold">Deeds of the Clan</h3>
          <span className="text-[11px] text-muted-foreground">
            Inscribe a deed to carve it into the Monument.
          </span>
        </div>
        {deeds.length === 0 ? (
          <p className="panel rounded-sm p-3 text-xs text-muted-foreground">
            No deeds yet. Take a castle, forge an artifact, be the first to fell a beast — or fall
            holding the line. The world remembers.
          </p>
        ) : (
          <ol className="space-y-2">
            {deeds.map((d) => {
              const done = inscribed.has(d.id);
              const cost = inscribeCost(d);
              const afford = state.gold >= cost;
              return (
                <li key={d.id} className="panel relative rounded-sm p-3 pl-4">
                  <span
                    className={`absolute left-0 top-0 h-full w-0.5 ${done ? "bg-gold/70" : "bg-border"}`}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-sm text-foreground">{d.title}</span>
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${CLASS_TONE[d.cls]}`}
                    >
                      {DEED_LABEL[d.cls]} · {d.weight}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{d.text}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {when(d.at)}
                    </span>
                    {done ? (
                      <span className="text-[11px] font-display text-gold">
                        ✦ Inscribed in stone
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2"
                        disabled={!afford}
                        onClick={() => api.inscribeDeed(d.id)}
                        title={afford ? undefined : `Need ${cost} gold`}
                      >
                        <span className="text-xs">Inscribe</span>
                        <span className="text-[10px] text-muted-foreground">{cost}g</span>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ------------------------------ the Reckoning -------------------------- */}
      <section className="panel rounded-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg text-gold">The Reckoning</h3>
            <p className="text-[11px] text-muted-foreground">
              End the Season of Ash and begin the next. Your Chronicle, renown, champions,
              inscriptions and vassals endure — the map is perturbed and rivals surge back stronger.
              You cannot win the war; you can only outlast another season of it.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  `Declare the Reckoning and begin Season ${(state.season ?? 1) + 1}? Everything you earned endures; the rivals return stronger.`,
                )
              )
                api.declareReckoning();
            }}
          >
            Declare the Reckoning
          </Button>
        </div>
      </section>
    </div>
  );
}
