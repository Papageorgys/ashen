import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import { DAMAGE_LABEL, typeMultVs, memberPower, getAffinity, BOND_AT } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { CLASS_BY_ID, MAX_PARTY_SIZE } from "@/lib/game/data";
import { TRAITS } from "@/lib/game/traits";
import {
  startEncounter,
  applyAction,
  currentUnit,
  tacticalReward,
  abilityTarget,
  tierById,
  isCovered,
  defaultRank,
  downedMemberIds,
  COND_META,
  MOMENTUM_MAX,
  BLOODED_MULT,
  TAC_TIERS,
  type TacState,
  type TacUnit,
  type TacAbility,
} from "@/lib/game/tactics";

/**
 * The Proving — the game's tactical, turn-based pillar (BG3). Take a rested
 * banner into a party-scaled bout and command each champion's turn by hand:
 * Strike, a signature ability, or Guard — and pick the target. Damage runs on
 * the same numbers as the rest of the game, so gear, runes and levels tell.
 */
export function TacticsPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [tac, setTac] = useState<TacState | null>(null);
  const [fought, setFought] = useState<string[]>([]);
  const [tierId, setTierId] = useState<string>(TAC_TIERS[0]!.id);
  const [pending, setPending] = useState<TacAbility | null>(null);
  const [claimed, setClaimed] = useState(false);
  // the formation-picking step: a banner chosen, its lines not yet set
  const [setupPartyId, setSetupPartyId] = useState<string | null>(null);
  const [formation, setFormation] = useState<Record<string, "front" | "back">>({});
  const [blooded, setBlooded] = useState(false);

  /** Member ids in a party that share a shield-bond with a banner-mate. */
  function bondedInParty(ids: string[]): string[] {
    const out = new Set<string>();
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        if (getAffinity(state, ids[i]!, ids[j]!) >= BOND_AT) {
          out.add(ids[i]!);
          out.add(ids[j]!);
        }
    return [...out];
  }

  // banners that could enter: have champions and aren't in the field
  const restedBanners = state.parties.filter(
    (p) => p.memberIds.length > 0 && !p.run && !p.travel && !p.farming,
  );

  const membersOf = (partyId: string) =>
    (state.parties.find((p) => p.id === partyId)?.memberIds ?? [])
      .map((id) => state.members.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m);

  /** Move from the banner list into the formation step. */
  function chooseBanner(partyId: string) {
    const f: Record<string, "front" | "back"> = {};
    for (const m of membersOf(partyId))
      f[m.id] = defaultRank(CLASS_BY_ID[m.classId]?.role ?? "blade");
    setFormation(f);
    setSetupPartyId(partyId);
  }

  function begin() {
    if (!setupPartyId) return;
    const members = membersOf(setupPartyId);
    if (members.length === 0) return;
    const ids = members.map((m) => m.id);
    setFought(ids);
    setTac(startEncounter(members, tierId, formation, bondedInParty(ids)));
    setSetupPartyId(null);
    setPending(null);
    setClaimed(false);
  }

  function act(ability: TacAbility, targetId?: string) {
    if (!tac) return;
    const target = abilityTarget(ability.shape);
    if ((target === "foe" || target === "ally") && !targetId) {
      setPending(ability); // wait for a target click
      return;
    }
    setTac(
      applyAction(tac, targetId ? { abilityId: ability.id, targetId } : { abilityId: ability.id }),
    );
    setPending(null);
  }

  const active = tac && tac.phase === "choose" ? currentUnit(tac) : null;
  const foughtMembers = useMemo(
    () => fought.map((id) => state.members.find((m) => m.id === id)).filter(Boolean),
    [fought, state.members],
  );

  /* ------------------------------- setup view ------------------------------ */
  if (!tac) {
    return (
      <div className="space-y-4">
        <section className="panel-ornate rounded-sm p-4">
          <h2 className="font-display text-lg text-gold">The Proving Grounds</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Take a rested banner into a turn-based bout and command it by hand. A proving is fought
            under friendly stakes — your champions cannot fall for good here — but the spoils are
            real: coin, experience, and the crown's favor.
          </p>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Your element leaves its mark: <span className="text-[#ff9d5c]">🔥 fire burns</span>,{" "}
            <span className="text-[#8fd0e0]">❄ frost chills</span> (foes hit softer),{" "}
            <span className="text-[#c9a8e6]">🕸 shadow dooms</span> and leeches life back,{" "}
            <span className="text-[#e0c060]">🩸 physical sunders</span> armour, and holy sears and
            mends. Hold the front line, protect the back, and press the attack — a full{" "}
            <span className="text-forge-ember">Press</span> unleashes an empowered Onslaught.
          </p>
        </section>

        <section className="panel rounded-sm p-4">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">The trial</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {TAC_TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierId(t.id)}
                className={cn(
                  "rounded-sm border p-2.5 text-left transition",
                  tierId === t.id
                    ? "border-gold bg-gold/10"
                    : "border-border/60 bg-black/20 hover:border-gold/50",
                )}
              >
                <div className="font-display text-sm text-gold">{t.name}</div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.blurb}</p>
                <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  ×{t.mult} spoils · +{t.favor} favor
                </div>
              </button>
            ))}
          </div>
        </section>

        {!setupPartyId ? (
          <section className="panel rounded-sm p-4">
            <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
              Choose a banner
            </h3>
            <div className="mt-3 space-y-2">
              {restedBanners.map((p) => {
                const members = membersOf(p.id);
                const power = members.reduce((n, m) => n + memberPower(m), 0);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm text-gold">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {members.length}/{MAX_PARTY_SIZE} champions · {Math.round(power)} power
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => chooseBanner(p.id)}
                      className="shrink-0 rounded-sm border border-gold bg-gradient-to-b from-gold to-[#c69a3e] px-3 py-1.5 font-display text-xs uppercase tracking-[0.12em] text-[#120d05] transition hover:brightness-110"
                    >
                      Muster ▸
                    </button>
                  </div>
                );
              })}
              {restedBanners.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No rested banner stands ready. Recall one from the field, or muster a new one.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="panel rounded-sm p-4">
            <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
              Set your formation
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The <span className="text-gold">front line</span> takes the enemy's blows and shields
              the <span className="text-gold">back rank</span> behind it — until it falls. Place
              your shields forward and your fragile behind.
            </p>
            <div className="mt-3 space-y-1.5">
              {membersOf(setupPartyId).map((m) => {
                const role = CLASS_BY_ID[m.classId]?.role ?? "blade";
                const rank = formation[m.id] ?? defaultRank(role);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-black/20 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs text-gold">{m.name}</div>
                      <div className="text-[10px] capitalize text-muted-foreground">
                        {role} · Lv {m.level}
                        {m.trait ? (
                          <span className="text-gold/70"> · {TRAITS[m.trait].name}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="inline-flex overflow-hidden rounded-sm border border-white/10">
                      {(["front", "back"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormation((f) => ({ ...f, [m.id]: r }))}
                          className={cn(
                            "px-2.5 py-1 font-display text-[10px] uppercase tracking-wider transition",
                            rank === r
                              ? "bg-gold/15 text-gold"
                              : "text-muted-foreground hover:text-gold/80",
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Blooded stakes — real wounds for richer spoils */}
            <button
              type="button"
              onClick={() => setBlooded((b) => !b)}
              className={cn(
                "mt-3 flex w-full items-center justify-between gap-2 rounded-sm border p-2.5 text-left transition",
                blooded
                  ? "border-destructive/60 bg-destructive/[0.08]"
                  : "border-border/60 bg-black/20 hover:border-destructive/40",
              )}
            >
              <span className="min-w-0">
                <span className="font-display text-xs text-gold">Blooded proving</span>
                <span className="block text-[10px] leading-snug text-muted-foreground">
                  Real stakes: any champion downed comes away with lasting wounds — but the spoils
                  pay ×{BLOODED_MULT}.
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em]",
                  blooded
                    ? "border-destructive text-destructive"
                    : "border-white/20 text-muted-foreground",
                )}
              >
                {blooded ? "On" : "Off"}
              </span>
            </button>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setSetupPartyId(null)}
                className="rounded-sm border border-border px-3 py-1.5 font-display text-xs uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold hover:text-gold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={begin}
                className="flex-1 rounded-sm border border-forge-ember bg-forge-ember/80 py-1.5 font-display text-xs uppercase tracking-[0.12em] text-[#160d06] transition hover:brightness-110"
              >
                Enter the {blooded ? "Blooded " : ""}proving ▸
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  /* ------------------------------ result view ------------------------------ */
  if (tac.phase !== "choose") {
    const won = tac.phase === "won";
    const reward = tacticalReward(
      tac,
      foughtMembers.filter((m): m is NonNullable<typeof m> => !!m),
      blooded,
    );
    const downed = downedMemberIds(tac);
    return (
      <div className="space-y-4">
        <section
          className={cn(
            "panel-ornate rounded-sm p-5 text-center",
            won ? "border-gold/50" : "border-destructive/40",
          )}
        >
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {tierById(tac.tierId).name}
          </div>
          <h2 className={cn("mt-1 font-display text-2xl", won ? "text-gold" : "text-destructive")}>
            {won ? "The bout is won" : "Beaten from the field"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {won
              ? "Your command carried the day. The watchers are impressed."
              : "The banner is bested — but every bout hones the blade."}
          </p>

          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            <Spoil label="Gold" value={`${reward.gold}`} />
            <Spoil label="Reputation" value={`${reward.rep}`} />
            <Spoil label="XP each" value={`${reward.xp}`} />
            <Spoil label="Royal favor" value={won ? `+${reward.favor}` : "—"} tone={won} />
          </div>

          {reward.blooded && downed.length > 0 && (
            <p className="mt-3 text-[11px] text-destructive">
              {downed.length} champion{downed.length === 1 ? "" : "s"} came away wounded — tend them
              in the Warband before they fight at full strength again.
            </p>
          )}

          {!claimed ? (
            <button
              type="button"
              onClick={() => {
                api.finishTactics(fought, reward, downed);
                setClaimed(true);
              }}
              className="mt-4 rounded-sm border border-forge-ember bg-forge-ember/80 px-5 py-2 font-display text-sm uppercase tracking-[0.12em] text-[#160d06] transition hover:brightness-110"
            >
              Claim the spoils
            </button>
          ) : (
            <p className="mt-4 text-xs text-[#9fce88]">Spoils taken to the treasury.</p>
          )}
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTac(null);
              setPending(null);
            }}
            className="flex-1 rounded-sm border border-border bg-black/20 py-2 font-display text-xs uppercase tracking-[0.12em] text-gold transition hover:border-gold"
          >
            Back to the grounds
          </button>
        </div>

        <TacLog log={tac.log} />
      </div>
    );
  }

  /* ------------------------------ battle view ------------------------------ */
  const foes = tac.units.filter((u) => u.side === "foe");
  const allies = tac.units.filter((u) => u.side === "ally");
  const targetKind = pending ? abilityTarget(pending.shape) : null;
  const foeSelectable = targetKind === "foe";
  const allySelectable = targetKind === "ally";

  return (
    <div className="space-y-3">
      {/* status bar */}
      <div className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-black/30 px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {tierById(tac.tierId).name} · Round {tac.round}
        </span>
        <span className="text-[11px] text-gold">{active ? `${active.name}'s turn` : "…"}</span>
        <button
          type="button"
          onClick={() => {
            setTac(null);
            setPending(null);
          }}
          className="rounded-sm border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition hover:border-destructive hover:text-destructive"
        >
          Retreat
        </button>
      </div>

      {/* momentum — the press of battle; at full, an Onslaught waits */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Press</span>
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-black/50">
          <span
            className={cn(
              "block h-full motion-safe:transition-[width]",
              tac.momentum >= MOMENTUM_MAX
                ? "bg-forge-ember motion-safe:animate-pulse"
                : "bg-gradient-to-r from-[#c69a3e] to-gold",
            )}
            style={{ width: `${Math.round((tac.momentum / MOMENTUM_MAX) * 100)}%` }}
          />
        </div>
        {tac.momentum >= MOMENTUM_MAX && (
          <span className="text-[9px] uppercase tracking-[0.12em] text-forge-ember">
            Onslaught ready
          </span>
        )}
      </div>

      {/* foes — drawn up in their lines */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          The foe
        </div>
        {(["front", "back"] as const).map((r) => {
          const row = foes.filter((f) => f.rank === r);
          if (!row.length) return null;
          return (
            <div key={r} className="mb-1.5">
              <div className="mb-0.5 text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {r} line
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {row.map((f) => (
                  <UnitCard
                    key={f.id}
                    unit={f}
                    selectable={foeSelectable && !f.down}
                    effVs={active?.dmgType}
                    covered={isCovered(tac, f)}
                    onClick={() => foeSelectable && pending && act(pending, f.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* your banner — your lines */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Your banner
        </div>
        {(["front", "back"] as const).map((r) => {
          const row = allies.filter((a) => a.rank === r);
          if (!row.length) return null;
          return (
            <div key={r} className="mb-1.5">
              <div className="mb-0.5 text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {r} line
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {row.map((a) => (
                  <UnitCard
                    key={a.id}
                    unit={a}
                    active={active?.id === a.id}
                    selectable={allySelectable && !a.down}
                    onClick={() => allySelectable && pending && act(pending, a.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* action bar for the active champion */}
      {active && (
        <div className="rounded-sm border border-gold/30 bg-gold/[0.04] p-2.5">
          {pending ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gold">
                {pending.name}: choose a{" "}
                {abilityTarget(pending.shape) === "ally" ? "champion" : "foe"}.
              </span>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-sm border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:border-gold hover:text-gold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {active.kit.map((ab) => {
                const cd = active.cds[ab.id] ?? 0;
                const disabled = cd > 0 || active.mp < ab.mp;
                return (
                  <button
                    key={ab.id}
                    type="button"
                    disabled={disabled}
                    title={`${ab.blurb}${ab.mp ? ` · ${ab.mp} focus` : ""}${ab.cooldown ? ` · ${ab.cooldown}r cooldown` : ""}`}
                    onClick={() => act(ab)}
                    className="flex flex-col items-start rounded-sm border border-white/10 bg-black/40 px-2.5 py-1.5 text-left transition enabled:hover:border-gold/60 enabled:hover:bg-gold/10 disabled:opacity-35"
                  >
                    <span className="font-display text-xs text-gold">{ab.name}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {cd > 0
                        ? `cooldown ${cd}`
                        : [ab.mp ? `${ab.mp} focus` : "free", ab.cooldown ? `${ab.cooldown}r` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <TacLog log={tac.log} />
    </div>
  );
}

function Spoil({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/30 px-2 py-1.5">
      <div
        className={cn("font-display text-lg tabular-nums", tone ? "text-[#5fd0c6]" : "text-gold")}
      >
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-[4px] w-full overflow-hidden rounded-full bg-black/50">
      <span
        className="block h-full motion-safe:transition-[width]"
        style={{ width: `${pct}%`, background: tone }}
      />
    </div>
  );
}

function UnitCard({
  unit,
  active,
  selectable,
  effVs,
  covered,
  onClick,
}: {
  unit: TacUnit;
  active?: boolean;
  selectable?: boolean;
  /** the active champion's damage type, to hint effectiveness on foe cards */
  effVs?: string | undefined;
  /** a back-rank foe shielded by its front line — harder to reach with one blow */
  covered?: boolean;
  onClick?: () => void;
}) {
  const foe = unit.side === "foe";
  // effectiveness hint: how the active champion's element fares vs this foe
  const eff = foe && effVs && unit.family ? typeMultVs(effVs as never, unit.family) : 1;
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      className={cn(
        "rounded-sm border p-2 text-left transition",
        unit.down && "opacity-35 grayscale",
        active && "border-gold ring-2 ring-gold/50",
        !active &&
          (foe ? "border-destructive/40 bg-destructive/[0.06]" : "border-border/60 bg-black/20"),
        selectable && "cursor-pointer ring-2 ring-forge-ember/70 hover:brightness-110",
        !selectable && "cursor-default",
      )}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="min-w-0 truncate font-display text-xs text-gold">{unit.name}</span>
        {foe && eff !== 1 && (
          <span
            className={cn("shrink-0 text-[9px]", eff > 1 ? "text-[#9fce88]" : "text-destructive")}
            title={eff > 1 ? "Weak to your element" : "Resists your element"}
          >
            {eff > 1 ? "▲weak" : "▼resist"}
          </span>
        )}
      </div>
      <div className="text-[9px] capitalize text-muted-foreground">
        {unit.sub}
        {!foe && <> · {DAMAGE_LABEL[unit.dmgType]}</>}
        {unit.guarding && <span className="text-[#5fd0c6]"> · guarding</span>}
        {covered && !unit.down && (
          <span className="text-[#9db4d8]" title="Shielded by its front line — harder to reach">
            {" "}
            · covered
          </span>
        )}
      </div>
      {/* the marks a unit is carrying — burn, chill, doom, sunder */}
      {unit.conds.length > 0 && !unit.down && (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {unit.conds.map((c) => (
            <span
              key={c.kind}
              className="rounded-[2px] bg-black/40 px-1 text-[8px] leading-tight text-[#e7d7ac]"
              title={`${COND_META[c.kind].label} — ${COND_META[c.kind].blurb} (${c.rounds}r)`}
            >
              {COND_META[c.kind].glyph}
              {c.kind === "sunder" && c.pot > 0.1 ? Math.round(c.pot * 10) : ""}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 space-y-1">
        <Bar value={unit.hp} max={unit.maxHp} tone={foe ? "#c0503a" : "#7ea86a"} />
        <div className="flex items-center justify-between gap-1 text-[9px] tabular-nums text-muted-foreground">
          <span>{unit.down ? "down" : `${unit.hp}/${unit.maxHp}`}</span>
          {!foe && unit.maxMp > 0 && <span className="text-[#6a8fd8]">{unit.mp} focus</span>}
        </div>
        {!foe && unit.maxMp > 0 && <Bar value={unit.mp} max={unit.maxMp} tone="#4f6bbf" />}
      </div>
    </button>
  );
}

function TacLog({ log }: { log: string[] }) {
  return (
    <div className="rounded-sm border border-border/60 bg-black/30 p-2.5">
      <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        The bout
      </div>
      <div className="space-y-0.5">
        {log.slice(0, 7).map((line, i) => (
          <p
            key={i}
            className={cn(
              "text-[11px] leading-snug",
              i === 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
