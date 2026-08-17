import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MapNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  requiresClan?: boolean;
}

export interface MapNavGroup {
  /** where these screens live — the Castle, the Town, the Realm */
  title: string;
  glyph: string;
  items: MapNavItem[];
}

/**
 * The war table's navigation, diegetic: instead of a standing rail, the game's
 * screens are reached through the places they belong — your Castle, the Town
 * below it, the Realm beyond — as menus in the map's own toolbar.
 */
export function MapNav({
  groups,
  founded,
  onSelect,
}: {
  groups: MapNavGroup[];
  founded: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {groups.map((g) => {
        const items = g.items.filter((i) => founded || !i.requiresClan);
        if (!items.length) return null;
        return (
          <DropdownMenu key={g.title}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={g.title}
                className="flex shrink-0 items-center gap-1 rounded-sm border border-white/10 px-2 py-1 font-display text-[10px] uppercase tracking-[0.12em] text-gold transition-colors hover:border-gold/50 hover:bg-gold/10"
              >
                <span aria-hidden="true">{g.glyph}</span>
                <span className="hidden sm:inline">{g.title}</span>
                <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                <span aria-hidden="true">{g.glyph}</span>
                {g.title}
              </DropdownMenuLabel>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.value}
                    onSelect={() => onSelect(item.value)}
                    className="gap-2"
                    title={item.hint}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
