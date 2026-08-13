import { Button } from "@/components/ui/button";
import { Portrait as PortraitView } from "@/components/game/Portrait";
import {
  BG_COLORS,
  BEARD_STYLES,
  BROW_STYLES,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MARK_STYLES,
  SKIN_TONES,
  randomPortrait,
  type Portrait,
} from "@/lib/game/identity";

function Cycler({
  label,
  onPrev,
  onNext,
  value,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm border border-border/60 px-2 py-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Previous ${label}`}
          onClick={onPrev}
          className="px-1.5 text-gold/70 transition hover:text-gold"
        >
          ‹
        </button>
        <span className="w-8 text-center text-xs text-foreground">{value}</span>
        <button
          type="button"
          aria-label={`Next ${label}`}
          onClick={onNext}
          className="px-1.5 text-gold/70 transition hover:text-gold"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function Palette({
  colors,
  value,
  onPick,
  label,
}: {
  colors: string[];
  value: number;
  onPick: (i: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${i + 1}`}
            onClick={() => onPick(i)}
            style={{ background: c }}
            className={`h-5 w-5 rounded-full border transition ${
              value === i ? "border-gold ring-1 ring-gold/60" : "border-border/60 hover:border-gold/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const cyc = (v: number, n: number, d: number) => (v + d + n) % n;

export function PortraitEditor({
  portrait,
  onChange,
  compact,
  classId,
}: {
  portrait: Portrait;
  onChange: (p: Portrait) => void;
  compact?: boolean;
  classId?: string | undefined;
}) {
  const set = (patch: Partial<Portrait>) => onChange({ ...portrait, ...patch });

  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-[6rem_1fr]" : "grid gap-4 sm:grid-cols-[9rem_1fr]"}>
      <div className="space-y-2">
        <PortraitView data={portrait} classId={classId} className={compact ? "h-24 w-24" : "h-36 w-full"} />
        <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={() => onChange(randomPortrait())}>
          Roll face
        </Button>
      </div>

      <div className="space-y-2">
        <div className="grid gap-1.5 sm:grid-cols-2">
          <Cycler
            label="Hair"
            value={String(portrait.hair + 1)}
            onPrev={() => set({ hair: cyc(portrait.hair, HAIR_STYLES, -1) })}
            onNext={() => set({ hair: cyc(portrait.hair, HAIR_STYLES, 1) })}
          />
          <Cycler
            label="Eyes"
            value={String(portrait.eyes + 1)}
            onPrev={() => set({ eyes: cyc(portrait.eyes, EYE_STYLES, -1) })}
            onNext={() => set({ eyes: cyc(portrait.eyes, EYE_STYLES, 1) })}
          />
          <Cycler
            label="Brows"
            value={String(portrait.brow + 1)}
            onPrev={() => set({ brow: cyc(portrait.brow, BROW_STYLES, -1) })}
            onNext={() => set({ brow: cyc(portrait.brow, BROW_STYLES, 1) })}
          />
          <Cycler
            label="Beard"
            value={portrait.beard === 0 ? "—" : String(portrait.beard)}
            onPrev={() => set({ beard: cyc(portrait.beard, BEARD_STYLES, -1) })}
            onNext={() => set({ beard: cyc(portrait.beard, BEARD_STYLES, 1) })}
          />
          <Cycler
            label="Scars"
            value={portrait.mark === 0 ? "—" : String(portrait.mark)}
            onPrev={() => set({ mark: cyc(portrait.mark, MARK_STYLES, -1) })}
            onNext={() => set({ mark: cyc(portrait.mark, MARK_STYLES, 1) })}
          />
        </div>
        <Palette colors={SKIN_TONES} value={portrait.skin} onPick={(i) => set({ skin: i })} label="Skin" />
        <Palette colors={HAIR_COLORS} value={portrait.hairColor} onPick={(i) => set({ hairColor: i })} label="Hair colour" />
        <Palette colors={BG_COLORS} value={portrait.bg} onPick={(i) => set({ bg: i })} label="Backing" />
      </div>
    </div>
  );
}
