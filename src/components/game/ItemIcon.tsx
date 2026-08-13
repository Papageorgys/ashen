import { ITEM_BY_ID, SET_BY_ITEM, splitItemId, type ItemId } from "@/lib/game/data";
import { cn } from "@/lib/utils";

const files = import.meta.glob<string>("@/assets/items/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});

const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.split("/").pop()!.replace(".png", ""),
    url,
  ]),
);

export function itemIcon(rawId: string): string | undefined {
  const id = splitItemId(rawId).base;
  if (ICONS[id]) return ICONS[id];
  const def = ITEM_BY_ID[id];
  // hands / feet / head pieces get art that matches the piece + armour school
  if (def?.armorType && def.slot && def.slot !== "armor") {
    const piece = ICONS[`piece_${def.armorType}_${def.slot}`];
    if (piece) return piece;
  }
  // otherwise armour pieces borrow the chest icon of their set
  const set = SET_BY_ITEM[id];
  if (set && ICONS[set.pieces[0]!]) return ICONS[set.pieces[0]!];
  // shots share one icon per family: blessed_soulshot_d -> soulshot
  const base = id.replace(/^blessed_/, "").replace(/_(low|ng|d|c)$/, "");
  return ICONS[base];
}


/** Square art frame for an item; falls back to a grade-tinted initial. */
export function ItemIcon({
  item,
  size = 32,
  className,
}: {
  item: ItemId;
  size?: number;
  className?: string;
}) {
  const def = ITEM_BY_ID[item];
  const src = itemIcon(item);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded border border-border/70 bg-background/60",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={def?.name ?? item}
          loading="lazy"
          width={512}
          height={512}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="font-display text-xs text-muted-foreground">
          {(def?.name ?? "?").slice(0, 1)}
        </span>
      )}
    </span>
  );
}
