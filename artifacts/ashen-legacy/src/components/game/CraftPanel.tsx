import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRAFT_MASTERIES,
  CRAFT_MASTERY_BLURB,
  CRAFT_MASTERY_LABEL,
  CLASS_BY_ID,
  GRADE_CLASS,
  ITEM_BY_ID,
  MAX_QUALITY,
  RECIPES,
  SLOT_LABEL,
  canRollQuality,
  type ItemDef,
} from "@/lib/game/data";
import {
  artisanRank,
  canCraft,
  craftChance,
  expectedQuality,
  qualityStepChance,
  slotOf,
  type GameState,
} from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { ItemTooltip } from "./ItemTooltip";
import { ItemIcon } from "./ItemIcon";
import type { ClanApi } from "@/hooks/useClanGame";

type Mastery = (typeof CRAFT_MASTERIES)[number];

/** Ornamental corner studs, like the rivets on an old client window. */
function Corners() {
  return (
    <>
      {[
        "left-0 top-0",
        "right-0 top-0",
        "left-0 bottom-0",
        "right-0 bottom-0",
      ].map((p) => (
        <span
          key={p}
          aria-hidden="true"
          className={cn("pointer-events-none absolute h-2 w-2 border border-forge-frame/80 bg-forge-frame/40", p)}
        />
      ))}
    </>
  );
}

function Window({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("l2-window rounded-sm", className)}>
      <Corners />
      <header className="l2-titlebar flex items-center justify-between gap-3 px-3 py-1.5">
        <div className="min-w-0">
          <h2 className="truncate font-display text-[13px] uppercase tracking-[0.22em] text-gold">
            {title}
          </h2>
          {subtitle && <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

/** A material / result cell drawn as a beveled inventory slot. */
function Slot({
  item,
  size = 44,
  lit,
  badge,
  badgeTone = "ok",
}: {
  item: string;
  size?: number;
  lit?: boolean;
  badge?: string;
  badgeTone?: "ok" | "bad";
}) {
  return (
    <ItemTooltip item={item}>
      <span
        className={cn("l2-slot relative inline-flex items-center justify-center rounded-[2px]", lit && "l2-slot-lit")}
        style={{ width: size, height: size }}
      >
        <ItemIcon item={item} size={Math.round(size * 0.78)} />
        {badge && (
          <span
            className={cn(
              "absolute -bottom-1 right-0 rounded-[2px] border px-1 text-[9px] leading-[1.3] tabular-nums",
              badgeTone === "bad"
                ? "border-destructive/70 bg-background text-destructive"
                : "border-forge-frame/80 bg-background text-foreground",
            )}
          >
            {badge}
          </span>
        )}
      </span>
    </ItemTooltip>
  );
}

function Gauge({ pct, tone = "gold" }: { pct: number; tone?: "gold" | "ember" }) {
  return (
    <div className="l2-inset h-2.5 w-full rounded-[2px]">
      <div
        className="h-full rounded-[1px] motion-safe:transition-[width] motion-safe:duration-300"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          backgroundImage:
            tone === "ember"
              ? "linear-gradient(180deg, var(--forge-ember), oklch(0.42 0.14 40))"
              : "linear-gradient(180deg, oklch(0.9 0.13 90), oklch(0.62 0.14 70))",
        }}
      />
    </div>
  );
}

export function CraftPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [mastery, setMastery] = useState<Mastery>(CRAFT_MASTERIES[0] as Mastery);
  const [selected, setSelected] = useState<string | null>(null);

  const owned = Object.entries(state.inventory)
    .filter(([, qty]) => (qty ?? 0) > 0)
    .map(([id]) => ITEM_BY_ID[id])
    .filter((i): i is ItemDef => !!i);
  const gearOwned = owned.filter((i) => i.kind === "gear");
  const artisans = state.members.filter((m) => CLASS_BY_ID[m.classId]!.role === "artisan");

  const recipes = useMemo(() => RECIPES.filter((r) => r.mastery === mastery), [mastery]);
  const recipe = recipes.find((r) => r.id === selected) ?? recipes[0] ?? null;

  const detail = recipe
    ? {
        res: ITEM_BY_ID[recipe.result]!,
        check: canCraft(state, recipe.id),
        chance: Math.round(craftChance(state, recipe.id) * 100),
        qStep: qualityStepChance(state, recipe.id),
      }
    : null;

  return (
    <div className="space-y-4">
      <Window
        title="Create Item"
        subtitle={`Only an artisan of the matching discipline may put hammer to steel. Inspiration: ${state.inspiration ?? 0} — a failed forge is retried for free.`}
        right={
          <span className="shrink-0 rounded-[2px] border border-forge-frame/70 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold">
            {CRAFT_MASTERY_LABEL[mastery]} rank {artisanRank(state, mastery)}
          </span>
        }
      >
        {/* discipline tabs */}
        <div role="tablist" aria-label="Crafting discipline" className="flex flex-wrap gap-1">
          {CRAFT_MASTERIES.map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={m === mastery}
              onClick={() => {
                setMastery(m as Mastery);
                setSelected(null);
              }}
              className={cn(
                "rounded-[2px] border px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.18em] motion-safe:transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                m === mastery
                  ? "border-gold/70 bg-primary/20 text-gold"
                  : "border-forge-frame/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {CRAFT_MASTERY_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="l2-rule my-3" />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* recipe list */}
          <div className="l2-inset max-h-[380px] overflow-y-auto rounded-[2px] p-1">
            {recipes.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No recipes known in this discipline.</p>
            )}
            <ul className="space-y-1">
              {recipes.map((r) => {
                const res = ITEM_BY_ID[r.result]!;
                const ok = canCraft(state, r.id).ok;
                const active = recipe?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r.id)}
                      aria-current={active}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[2px] border px-2 py-1.5 text-left motion-safe:transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-gold/60 bg-primary/15"
                          : "border-transparent hover:border-forge-frame/60 hover:bg-secondary/40",
                      )}
                    >
                      <Slot item={r.result} size={34} lit={active} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-xs", GRADE_CLASS[res.grade])}>
                          {res.name}
                          {r.qty && r.qty > 1 ? ` ×${r.qty}` : ""}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          [{res.grade}] · {r.gold}g · rank {r.artisans}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-display text-[11px] tabular-nums",
                          ok ? "text-gold" : "text-muted-foreground/60",
                        )}
                      >
                        {Math.round(craftChance(state, r.id) * 100)}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* detail pane */}
          {detail && recipe ? (
            <div className="l2-inset flex flex-col gap-3 rounded-[2px] p-3">
              <div className="flex items-start gap-3">
                <Slot item={recipe.result} size={64} lit />
                <div className="min-w-0">
                  <div className={cn("font-display text-sm", GRADE_CLASS[detail.res.grade])}>
                    {detail.res.name}
                    {recipe.qty && recipe.qty > 1 ? ` ×${recipe.qty}` : ""}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Grade {detail.res.grade}
                    {detail.res.power !== undefined ? ` · +${detail.res.power} pwr` : ""}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {CRAFT_MASTERY_LABEL[mastery]} rank {recipe.artisans} required
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Materials
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {recipe.inputs.map((i) => {
                    const have = state.inventory[i.item] ?? 0;
                    const enough = have >= i.qty;
                    return (
                      <Slot
                        key={i.item}
                        item={i.item}
                        size={42}
                        lit={enough}
                        badge={`${have}/${i.qty}`}
                        badgeTone={enough ? "ok" : "bad"}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Forge fee</span>
                  <span className={cn("tabular-nums", state.gold >= recipe.gold ? "text-gold" : "text-destructive")}>
                    {recipe.gold} gold
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-display uppercase tracking-[0.18em] text-muted-foreground">
                    Success rate
                  </span>
                  <span className="tabular-nums text-gold">{detail.chance}%</span>
                </div>
                <Gauge pct={detail.chance} />
                {canRollQuality(detail.res) && (
                  <>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="font-display uppercase tracking-[0.18em] text-muted-foreground">
                        Quality step
                      </span>
                      <span className="tabular-nums text-grade-a">
                        {Math.round(detail.qStep * 100)}% · avg +{expectedQuality(detail.qStep).toFixed(1)} / {MAX_QUALITY}
                      </span>
                    </div>
                    <Gauge pct={detail.qStep * 100} tone="ember" />
                  </>
                )}
              </div>

              {!detail.check.ok && (
                <p className="text-[11px] text-destructive" role="status">
                  {detail.check.why}
                </p>
              )}

              <Button
                className="mt-auto w-full font-display uppercase tracking-[0.2em]"
                disabled={!detail.check.ok}
                onClick={() => api.craft(recipe.id)}
              >
                Forge
              </Button>
            </div>
          ) : (
            <div className="l2-inset rounded-[2px] p-4 text-xs text-muted-foreground">
              Choose a recipe to inspect its materials.
            </div>
          )}
        </div>
      </Window>

      <div className="grid gap-4 lg:grid-cols-2">
        <Window
          title="Artisan Disciplines"
          subtitle="Each artisan devotes themselves to a single craft."
        >
          <div className="space-y-2">
            {artisans.map((m) => (
              <div
                key={m.id}
                className="l2-inset flex items-center justify-between gap-3 rounded-[2px] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-display text-sm">{m.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {m.craftMastery ? CRAFT_MASTERY_BLURB[m.craftMastery] : "No discipline chosen yet."}
                  </div>
                </div>
                <Select
                  {...(m.craftMastery ? { value: m.craftMastery } : {})}
                  onValueChange={(v) => api.setCraftMastery(m.id, v as never)}
                >
                  <SelectTrigger className="h-7 w-32 shrink-0 text-xs" aria-label={`Discipline for ${m.name}`}>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRAFT_MASTERIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CRAFT_MASTERY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {artisans.length === 0 && (
              <p className="text-sm text-muted-foreground">Recruit an artisan before the forge can burn.</p>
            )}
          </div>
        </Window>

        <Window title="Spoils" subtitle="Everything your banners dragged home.">
          <div className="grid max-h-[300px] gap-1.5 overflow-y-auto">
            {owned.map((i) => (
              <div
                key={i.id}
                className="l2-inset flex items-center justify-between gap-2 rounded-[2px] px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Slot item={i.id} size={32} />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-xs", GRADE_CLASS[i.grade])}>{i.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      [{i.grade}] ×{state.inventory[i.id]}
                    </span>
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => api.sell(i.id)}>
                  Sell {i.value}g
                </Button>
              </div>
            ))}
            {owned.length === 0 && (
              <p className="text-sm text-muted-foreground">Your vault is bare. Go hunting.</p>
            )}
          </div>
        </Window>
      </div>

      <Window
        title="Outfit"
        subtitle="Weapon, chest, hands, feet, head and one jewel per member — gear has level requirements."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {state.members.map((m) => (
            <div key={m.id} className="l2-inset rounded-[2px] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm">{m.name}</span>
                <Select
                  onValueChange={(v) => api.equip(m.id, v as never)}
                  disabled={gearOwned.length === 0 || m.gear.length >= 6}
                >
                  <SelectTrigger className="h-7 w-36 text-xs" aria-label={`Equip gear on ${m.name}`}>
                    <SelectValue placeholder="Equip" />
                  </SelectTrigger>
                  <SelectContent>
                    {gearOwned.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {SLOT_LABEL[slotOf(g.id) ?? "weapon"]} · {g.name} ×{state.inventory[g.id]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.gear.map((g, idx) => (
                  <ItemTooltip key={`${g}-${idx}`} item={g}>
                    <button
                      onClick={() => api.unequip(m.id, idx)}
                      className={cn(
                        "cursor-pointer rounded-[2px] border border-forge-frame/60 bg-background/60 px-1.5 py-0.5 text-[10px]",
                        GRADE_CLASS[ITEM_BY_ID[g]!.grade],
                      )}
                    >
                      {ITEM_BY_ID[g]!.name} ✕
                    </button>
                  </ItemTooltip>
                ))}
                {m.gear.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">Unequipped</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Window>
    </div>
  );
}
