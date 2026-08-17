import type { LucideIcon } from "lucide-react";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface NavRailItem {
  value: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  requiresClan?: boolean;
}

export interface NavRailGroup {
  title: string;
  items: NavRailItem[];
}

function RailButton({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative grid h-11 w-11 shrink-0 place-items-center rounded-sm border transition-colors",
            active
              ? "border-gold/70 bg-gold/15 text-gold"
              : "border-white/10 bg-black/20 text-muted-foreground hover:border-gold/40 hover:text-gold",
          )}
        >
          {/* active spine — a gold bar on the rail's inner edge */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-full bg-gold lg:block"
            />
          )}
          <Icon className="h-5 w-5" aria-hidden />
          {/* label shown inline on the horizontal (mobile) rail */}
          <span className="ml-1 text-[11px] lg:hidden">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-48">
        <div className="font-display text-xs text-gold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The war table's navigation — a standing dock of every screen, always in view,
 * so the whole game is one click away (replacing the old hidden burger). A
 * vertical rail on desktop, a horizontal scroll strip on small screens. The map
 * is home; the "War Table" button dismisses whatever screen is open over it.
 */
export function NavRail({
  groups,
  active,
  founded,
  onSelect,
}: {
  groups: NavRailGroup[];
  active: string | null;
  founded: boolean;
  onSelect: (value: string | null) => void;
}) {
  return (
    <nav
      aria-label="War table navigation"
      className={cn(
        "flex shrink-0 gap-1.5 border-border/60 bg-[#140f0a]/60 p-1.5",
        // horizontal strip on mobile, vertical rail on desktop
        "flex-row overflow-x-auto border-b",
        "lg:w-[3.75rem] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:border-b-0 lg:border-r",
      )}
    >
      {/* home — the map itself */}
      <RailButton
        icon={Swords}
        label="War Table"
        hint="The map — deploy your banners across Aethyr"
        active={active === null}
        onClick={() => onSelect(null)}
      />

      {groups.map((group) => {
        const items = group.items.filter((i) => founded || !i.requiresClan);
        if (!items.length) return null;
        return (
          <div key={group.title} className="flex flex-row gap-1.5 lg:flex-col">
            {/* group divider */}
            <div
              aria-hidden="true"
              className="mx-0.5 my-1 hidden w-full border-t border-white/10 lg:block"
            />
            {items.map((item) => (
              <RailButton
                key={item.value}
                icon={item.icon}
                label={item.label}
                hint={item.hint}
                active={active === item.value}
                onClick={() => onSelect(item.value)}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}
