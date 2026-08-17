import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { generateWorld } from "@/lib/realm/worldgen";
import { RealmMap } from "@/components/realm/RealmMap";
import { RealmHud } from "@/components/realm/RealmHud";
import { ProvincePanel } from "@/components/realm/ProvincePanel";
import { AmbientStage } from "@/components/game/AmbientStage";
import { TERRAIN } from "@/lib/realm/terrain";

export const Route = createFileRoute("/realm")({
  head: () => ({
    meta: [
      { title: "Ashen — The Realm" },
      {
        name: "description",
        content:
          "A living medieval-fantasy world. Rule a province, command the map, and grow from a single castle into a kingdom.",
      },
    ],
  }),
  component: RealmPage,
});

const LEGEND: { id: keyof typeof TERRAIN; label: string }[] = [
  { id: "farmland", label: "Farmland" },
  { id: "plains", label: "Plains" },
  { id: "forest", label: "Forest" },
  { id: "hills", label: "Hills" },
  { id: "mountains", label: "Mountains" },
  { id: "swamp", label: "Swamp" },
  { id: "desert", label: "Desert" },
];

function RealmPage() {
  const [gen, setGen] = useState(0);
  const world = useMemo(() => generateWorld({ seed: `aethyr-${gen}` }), [gen]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <AmbientStage />
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
        {/* header */}
        <header className="plaque relative z-20 flex items-center gap-3 px-4 py-2">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              A living world
            </div>
            <h1 className="gilded font-display text-xl leading-none">The Realm of Aethyr</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setGen((g) => g + 1);
              }}
              className="rounded-sm border border-gold/30 bg-gold/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-gold transition hover:border-gold/60"
            >
              Forge a new realm
            </button>
            <Link
              to="/"
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/40 hover:text-gold"
            >
              War Table
            </Link>
          </div>
        </header>

        {/* the map is the whole stage */}
        <div className="relative min-h-0 flex-1">
          <RealmMap
            world={world}
            selectedId={selected}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            className="h-full w-full"
          />

          {/* realm summary, top-left */}
          <div className="pointer-events-none absolute left-3 top-3 z-20">
            <RealmHud world={world} />
          </div>

          {/* province detail, right */}
          {selected && (
            <div className="pointer-events-none absolute right-3 top-3 z-20">
              <ProvincePanel
                world={world}
                provinceId={selected}
                onClose={() => setSelected(null)}
              />
            </div>
          )}

          {/* legend + hint, bottom */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-sm border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
              {LEGEND.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: TERRAIN[t.id].fill }}
                  />
                  {t.label}
                </span>
              ))}
            </div>
            <span className="rounded-sm border border-white/10 bg-black/60 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm">
              Scroll to zoom · drag to pan · click a province
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
