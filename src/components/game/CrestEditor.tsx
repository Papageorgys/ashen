import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClanCrest } from "@/components/game/ClanCrest";
import {
  CREST_ACCENTS,
  CREST_CHARGES,
  CREST_DIVISIONS,
  CREST_FIELDS,
  CREST_SHAPES,
  MOTTOS,
  type Crest,
} from "@/lib/game/identity";

function Swatches({
  colors,
  value,
  onPick,
  label,
}: {
  colors: string[];
  value: string;
  onPick: (c: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => onPick(c)}
            style={{ background: c }}
            className={`h-6 w-6 rounded-sm border transition ${
              value === c ? "border-gold ring-1 ring-gold/60" : "border-border/60 hover:border-gold/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Choices<T extends string>({
  options,
  value,
  onPick,
  label,
}: {
  options: { id: T; name: string }[];
  value: T;
  onPick: (v: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className={`rounded-sm border px-2 py-1 text-xs transition ${
              value === o.id
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-border/60 text-muted-foreground hover:border-gold/40"
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CrestEditor({
  crest,
  motto,
  onChange,
  onMotto,
}: {
  crest: Crest;
  motto: string;
  onChange: (c: Crest) => void;
  onMotto: (m: string) => void;
}) {
  const set = (patch: Partial<Crest>) => onChange({ ...crest, ...patch });
  const [mottoIdx, setMottoIdx] = useState(0);

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
      <div className="space-y-2">
        <ClanCrest crest={crest} className="h-36 w-full" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() =>
            set({
              shape: CREST_SHAPES[Math.floor(Math.random() * CREST_SHAPES.length)]!.id,
              division: CREST_DIVISIONS[Math.floor(Math.random() * CREST_DIVISIONS.length)]!.id,
              field: CREST_FIELDS[Math.floor(Math.random() * CREST_FIELDS.length)]!,
              accent: CREST_ACCENTS[Math.floor(Math.random() * CREST_ACCENTS.length)]!,
              charge: CREST_CHARGES[Math.floor(Math.random() * CREST_CHARGES.length)]!.id,
            })
          }
        >
          Roll arms
        </Button>
      </div>

      <div className="space-y-3">
        <Choices options={CREST_SHAPES} value={crest.shape} onPick={(v) => set({ shape: v })} label="Shield" />
        <Choices
          options={CREST_DIVISIONS}
          value={crest.division}
          onPick={(v) => set({ division: v })}
          label="Division"
        />
        <Choices options={CREST_CHARGES} value={crest.charge} onPick={(v) => set({ charge: v })} label="Charge" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Swatches colors={CREST_FIELDS} value={crest.field} onPick={(c) => set({ field: c })} label="Field" />
          <Swatches colors={CREST_ACCENTS} value={crest.accent} onPick={(c) => set({ accent: c })} label="Charge colour" />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Motto</div>
          <div className="flex gap-2">
            <Input value={motto} maxLength={44} onChange={(e) => onMotto(e.target.value)} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = (mottoIdx + 1) % MOTTOS.length;
                setMottoIdx(next);
                onMotto(MOTTOS[next]!);
              }}
            >
              Suggest
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
