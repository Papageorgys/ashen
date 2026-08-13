import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  ARMOR_LABEL,
  GRADE_CLASS,
  ITEM_BY_ID,
  MAX_QUALITY,
  SET_BY_ITEM,
  SLOT_LABEL,
  qualityLabel,
  splitItemId,
  STAT_LABEL,
  type ItemId,
  type Stats,
} from "@/lib/game/data";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./ItemIcon";

/** Wraps any element so hovering it reveals the full item card. */
export function ItemTooltip({
  item,
  children,
  className,
}: {
  item: ItemId;
  children: React.ReactNode;
  className?: string;
}) {
  const def = ITEM_BY_ID[item];
  if (!def) return <>{children}</>;
  const stats = Object.entries(def.stats ?? {}) as [keyof Stats, number][];
  const { base, quality } = splitItemId(item);
  const set = SET_BY_ITEM[base];

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <span className={cn("cursor-help", className)}>{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 border-border bg-card p-3" side="top">
        <div className="flex items-start gap-2">
          <ItemIcon item={item} size={44} />
          <div className="min-w-0">
            <div className={cn("font-display text-sm", GRADE_CLASS[def.grade])}>{def.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {def.grade} grade ·{" "}
              {def.kind === "gear"
                ? SLOT_LABEL[def.slot ?? "weapon"]
                : def.kind === "shot"
                  ? "Consumable"
                  : "Material"}
              {def.armorType ? ` · ${ARMOR_LABEL[def.armorType]}` : ""}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs italic text-muted-foreground">{def.desc}</p>
        <div className="mt-2 space-y-0.5 text-xs">
          {def.power !== undefined && <div className="text-gold">+{def.power} power</div>}
          {stats.length > 0 && (
            <div className="text-primary">
              {stats.map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(" · ")}
            </div>
          )}
          {quality > 0 && (
            <div className="text-grade-a">
              {qualityLabel(quality)} — quality {quality}/{MAX_QUALITY}
            </div>
          )}
          {set && (
            <div className="mt-1 rounded-sm border border-border/70 p-1.5">
              <div className="text-[10px] uppercase tracking-widest text-gold">{set.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {set.pieces.map((p) => ITEM_BY_ID[p]?.name).join(" · ")}
              </div>
              <div className="mt-0.5 text-[10px] text-primary">
                Full set: +{set.bonus.power} power ·{" "}
                {Object.entries(set.bonus.stats)
                  .map(([k, v]) => `${STAT_LABEL[k as keyof Stats]} +${v}`)
                  .join(" · ")}
              </div>
            </div>
          )}
          {def.reqLevel !== undefined && (
            <div className="text-muted-foreground">Requires level {def.reqLevel}</div>
          )}
          <div className="text-muted-foreground">Sells for {def.value}g</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
