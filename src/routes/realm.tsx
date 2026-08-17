import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { generateWorld } from "@/lib/realm/worldgen";
import { spawnStartingArmies, pathfind } from "@/lib/realm/army";
import { tickRealm, type BattleEvent, type RealmState } from "@/lib/realm/sim";
import { RealmMap } from "@/components/realm/RealmMap";
import { RealmHud } from "@/components/realm/RealmHud";
import { ProvincePanel } from "@/components/realm/ProvincePanel";
import { ArmyPanel } from "@/components/realm/ArmyPanel";
import { BattleReport } from "@/components/realm/BattleReport";
import { AmbientStage } from "@/components/game/AmbientStage";
import { TERRAIN } from "@/lib/realm/terrain";

export const Route = createFileRoute("/realm")({
  head: () => ({
    meta: [
      { title: "Ashen — The Realm" },
      {
        name: "description",
        content:
          "A living medieval-fantasy world. Rule a province, march your host across the map, and grow from a single castle into a kingdom.",
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

const SPEED = 6; // days per real second while running

function RealmPage() {
  const [gen, setGen] = useState(0);
  const initial = useMemo<RealmState>(() => {
    const world = generateWorld({ seed: `aethyr-${gen}` });
    return { world, armies: spawnStartingArmies(world), day: 0 };
  }, [gen]);

  const stateRef = useRef<RealmState>(initial);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [selProv, setSelProv] = useState<string | null>(null);
  const [selArmy, setSelArmy] = useState<string | null>(null);
  const [report, setReport] = useState<BattleEvent | null>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    stateRef.current = initial;
    setSelProv(null);
    setSelArmy(null);
    setReport(null);
    force();
  }, [initial]);

  // the real-time clock: advance marching hosts, surface any battles
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const st = stateRef.current;
      if (st.armies.some((a) => a.path.length > 0)) {
        const events = tickRealm(st, dt * SPEED);
        if (events.length) setReport(events[events.length - 1]!);
        force();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, initial]);

  const st = stateRef.current;
  const world = st.world;
  const playerId = world.playerKingdomId;

  const selectArmy = (id: string) => {
    setSelArmy((cur) => (cur === id ? null : id));
    setSelProv(null);
  };
  const clickProvince = (id: string) => {
    const army = selArmy ? st.armies.find((a) => a.id === selArmy) : null;
    if (army && army.ownerId === playerId) {
      const path = pathfind(world, army.provinceId, id);
      if (path.length) {
        army.path = path;
        army.legProgress = 0;
        setPlaying(true);
        force();
      }
      return;
    }
    setSelProv((cur) => (cur === id ? null : id));
  };

  const activeArmy = selArmy ? st.armies.find((a) => a.id === selArmy) : null;

  return (
    <>
      <AmbientStage />
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
        <header className="plaque relative z-20 flex items-center gap-3 px-4 py-2">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              A living world
            </div>
            <h1 className="gilded font-display text-xl leading-none">The Realm of Aethyr</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-sm border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] tabular-nums text-muted-foreground">
              Day {Math.floor(st.day)}
            </span>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              {playing ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => setGen((g) => g + 1)}
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

        <div className="relative min-h-0 flex-1">
          <RealmMap
            world={world}
            armies={st.armies}
            selectedId={selProv}
            selectedArmyId={selArmy}
            onSelect={clickProvince}
            onSelectArmy={selectArmy}
            className="h-full w-full"
          />

          <div className="pointer-events-none absolute left-3 top-3 z-20">
            <RealmHud world={world} />
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col gap-3">
            {activeArmy && (
              <ArmyPanel
                world={world}
                army={activeArmy}
                isPlayer={activeArmy.ownerId === playerId}
                onClose={() => setSelArmy(null)}
              />
            )}
            {!activeArmy && selProv && (
              <ProvincePanel world={world} provinceId={selProv} onClose={() => setSelProv(null)} />
            )}
            {report && <BattleReport event={report} onClose={() => setReport(null)} />}
          </div>

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
              Click your host, then a province to march · scroll to zoom · drag to pan
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
