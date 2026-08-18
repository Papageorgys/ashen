import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { pathfind } from "@/lib/realm/army";
import {
  tickRealm,
  resolvePending,
  withdrawArmy,
  type BattleEvent,
  type PendingBattle,
} from "@/lib/realm/sim";
import type { Tactic } from "@/lib/realm/battle";
import { collectSeason } from "@/lib/realm/kingdom";
import { pickEvent, applyOutcome, type Choice, type RealmEvent } from "@/lib/realm/events";
import { freshRealm, loadRealm, saveRealm, clearRealm, type RealmWorld } from "@/lib/realm/persist";
import { planEnemyKingdoms } from "@/lib/realm/ai";
import {
  diplomacyTick,
  evaluateProposal,
  type DiploAction,
  type ProposalResult,
} from "@/lib/realm/diplomacy";
import { computeVisible, rememberVisible, spyTick, placeSpy, SPY_COST } from "@/lib/realm/intel";
import { reinforce, fortCost, MAX_FORT, type TaxRate } from "@/lib/realm/kingdom";
import { updateFactions, checkRebellion } from "@/lib/realm/factions";
import { recruit, drill, tickMuster } from "@/lib/realm/military";
import type { UnitType } from "@/lib/realm/army";
import { updateMarket, buy, sell, type Tradeable } from "@/lib/realm/market";
import { advanceYear } from "@/lib/realm/dynasty";
import { record, yearOf } from "@/lib/realm/annals";
import { makeRng } from "@/lib/realm/rng";
import { RealmMap } from "@/components/realm/RealmMap";
import { RealmHud } from "@/components/realm/RealmHud";
import { ProvincePanel } from "@/components/realm/ProvincePanel";
import { ArmyPanel } from "@/components/realm/ArmyPanel";
import { BattleReport } from "@/components/realm/BattleReport";
import { CouncilPanel } from "@/components/realm/CouncilPanel";
import { EventCard } from "@/components/realm/EventCard";
import { Chronicle } from "@/components/realm/Chronicle";
import { DiplomacyPanel } from "@/components/realm/DiplomacyPanel";
import { SpymasterPanel } from "@/components/realm/SpymasterPanel";
import { MarketPanel } from "@/components/realm/MarketPanel";
import { AnnalsPanel } from "@/components/realm/AnnalsPanel";
import { BattlePlanCard } from "@/components/realm/BattlePlanCard";
import { FactionsPanel } from "@/components/realm/FactionsPanel";
import { MusterPanel } from "@/components/realm/MusterPanel";
import { AmbientStage } from "@/components/game/AmbientStage";
import { GameIcon } from "@/components/game/GameIcon";
import { TERRAIN } from "@/lib/realm/terrain";

export const Route = createFileRoute("/realm")({
  head: () => ({
    meta: [
      { title: "Ashen — The Realm" },
      {
        name: "description",
        content:
          "A living medieval-fantasy world: rule a kingdom, heed your council, march your host, and grow from a single castle into an empire.",
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

const SPEED = 6; // days per real second
const SEASON_DAYS = 90;

function RealmPage() {
  const [gen, setGen] = useState(0);
  const initial = useMemo<RealmWorld>(() => freshRealm(gen), [gen]);

  const ref = useRef<RealmWorld>(initial);
  const chronicleRef = useRef<BattleEvent[]>([]);
  const diploSeq = useRef(0);
  const loadedRef = useRef(false);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [selProv, setSelProv] = useState<string | null>(null);
  const [selArmy, setSelArmy] = useState<string | null>(null);
  const [report, setReport] = useState<BattleEvent | null>(null);
  const [pendingEvent, setPendingEvent] = useState<RealmEvent | null>(null);
  const [showCouncil, setShowCouncil] = useState(false);
  const [showDiplo, setShowDiplo] = useState(false);
  const [showSpy, setShowSpy] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showAnnals, setShowAnnals] = useState(false);
  const [showEstates, setShowEstates] = useState(false);
  const [showMuster, setShowMuster] = useState(false);
  const [pendingBattle, setPendingBattle] = useState<PendingBattle | null>(null);
  const [playing, setPlaying] = useState(true);
  const yearRef = useRef(1);

  useEffect(() => {
    ref.current = initial;
    // on first mount, resume a saved realm if one exists
    if (!loadedRef.current) {
      loadedRef.current = true;
      const saved = loadRealm();
      if (saved) ref.current = saved;
    }
    chronicleRef.current = [];
    setSelProv(null);
    setSelArmy(null);
    setReport(null);
    setPendingEvent(null);
    setShowCouncil(false);
    setShowDiplo(false);
    setShowSpy(false);
    setShowMarket(false);
    setShowAnnals(false);
    setShowEstates(false);
    setShowMuster(false);
    setPendingBattle(null);
    yearRef.current = yearOf(ref.current.state.day);
    // fold in what the starting holdings can see
    rememberVisible(
      ref.current.state.world,
      ref.current.intel,
      computeVisible(
        ref.current.state.world,
        ref.current.state.armies,
        ref.current.intel,
        ref.current.state.world.playerKingdomId,
      ),
    );
    setPlaying(true);
    force();
  }, [initial]);

  // persist the realm when the tab is hidden or closed
  useEffect(() => {
    const save = () => saveRealm(ref.current);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, []);

  // the clock: advance hosts, and each season collect taxes + maybe raise an event
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const { state, ledger } = ref.current;
      const pid = state.world.playerKingdomId;
      const { events, pending } = tickRealm(state, dt * SPEED, { playerId: pid });
      if (pending) {
        setPendingBattle(pending);
        setPlaying(false);
      }
      // finished recruits join the garrison
      tickMuster(ref.current.muster, state.armies, state.day);
      // fold newly-scouted ground into the player's memory
      rememberVisible(
        state.world,
        ref.current.intel,
        computeVisible(state.world, state.armies, ref.current.intel, pid),
      );
      if (events.length) {
        chronicleRef.current = [...events.slice().reverse(), ...chronicleRef.current].slice(0, 12);
        // only a battle touching the player interrupts with the big report card
        const mine = events.find((e) => e.attackerKingdomId === pid || e.defenderKingdomId === pid);
        if (mine) setReport(mine);
        // a conquest from another crown is written into the permanent annals
        for (const e of events)
          if (e.captured && e.defenderKingdomId)
            record(
              ref.current.annals,
              state.day,
              "conquest",
              `${e.attackerName} seized ${e.provinceName} from ${e.defenderName}.`,
            );
      }
      // a new year turns: rulers age, some die and are succeeded
      const yr = yearOf(state.day);
      if (yr > yearRef.current) {
        yearRef.current = yr;
        advanceYear(
          ref.current.rulers,
          state.world,
          ref.current.dip,
          ref.current.annals,
          state.day,
          makeRng(state.world.seed ^ (yr * 2246822519)),
        );
      }
      if (state.day >= ledger.season * SEASON_DAYS) {
        // rival crowns feud and take their turn, then the season is collected
        diplomacyTick(
          ref.current.dip,
          state.world,
          state.armies,
          makeRng(state.world.seed ^ (ledger.season * 40961)),
        );
        spyTick(
          ref.current.intel,
          state.world,
          ref.current.dip,
          pid,
          makeRng(state.world.seed ^ (ledger.season * 55009)),
        );
        planEnemyKingdoms(
          state.world,
          state.armies,
          ref.current.dip,
          makeRng(state.world.seed ^ (ledger.season * 104729)),
        );
        updateMarket(
          ref.current.market,
          state.world,
          ref.current.dip,
          makeRng(state.world.seed ^ (ledger.season * 71933)),
        );
        collectSeason(ledger, state.world, pid, state.armies);
        // the estates judge the reign, and may rise against it
        updateFactions(ref.current.factions, state.world, ref.current.dip, ledger, pid, ledger.tax);
        checkRebellion(
          ref.current.factions,
          state.world,
          ledger,
          ref.current.annals,
          pid,
          state.day,
          makeRng(state.world.seed ^ (ledger.season * 88259)),
        );
        saveRealm(ref.current); // autosave once per season
        const rng = makeRng(state.world.seed ^ (ledger.season * 7919));
        if (rng() < 0.7) {
          const ev = pickEvent(state.world, ledger, pid, rng);
          if (ev) {
            setPendingEvent(ev);
            setPlaying(false);
          }
        }
      }
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, initial]);

  const { state, ledger, council, dip, intel, market, rulers, annals, factions, muster } =
    ref.current;
  const world = state.world;
  const playerId = world.playerKingdomId;
  const playerName = world.kingdoms.find((k) => k.id === playerId)?.name ?? "Your House";

  const doRecruit = (t: UnitType) => {
    recruit(ledger, muster, world, state.armies, playerId, t, state.day);
    force();
  };
  const doDrill = (armyId: string) => {
    const a = state.armies.find((x) => x.id === armyId);
    if (a) drill(ledger, a);
    force();
  };

  const trade = (t: Tradeable, side: "buy" | "sell") => {
    if (side === "buy") buy(ledger, market, t, 10);
    else sell(ledger, market, t, 10);
    force();
  };

  const chooseTactic = (choice: Tactic | "withdraw") => {
    if (!pendingBattle) return;
    if (choice === "withdraw") {
      withdrawArmy(state, pendingBattle);
    } else {
      const ev = resolvePending(state, pendingBattle, choice);
      if (ev) {
        chronicleRef.current = [ev, ...chronicleRef.current].slice(0, 12);
        setReport(ev);
        if (ev.captured && ev.defenderKingdomId)
          record(
            annals,
            state.day,
            "conquest",
            `${ev.attackerName} seized ${ev.provinceName} from ${ev.defenderName}.`,
          );
      }
    }
    setPendingBattle(null);
    setPlaying(true);
    force();
  };
  const pendingArmy = pendingBattle
    ? state.armies.find((a) => a.id === pendingBattle.armyId)
    : null;

  const visible = computeVisible(world, state.armies, intel, playerId);
  const fog = {
    visible,
    seen: intel.seen,
    lastOwner: intel.lastOwner,
    spied: new Set(Object.keys(intel.spies)),
  };

  const placeSpyOn = (kingdomId: string) => {
    if (ledger.treasury < SPY_COST) return;
    ledger.treasury -= SPY_COST;
    placeSpy(intel, kingdomId, state.day);
    force();
  };

  const diploEvaluate = (rivalId: string, action: DiploAction): ProposalResult => {
    if (action === "tribute") {
      if (ledger.treasury < 60)
        return { accepted: false, response: "The treasury cannot spare the gift." };
      ledger.treasury -= 60;
    }
    diploSeq.current += 1;
    const res = evaluateProposal(
      dip,
      world,
      state.armies,
      playerId,
      rivalId,
      action,
      makeRng(world.seed ^ (diploSeq.current * 2654435761)),
    );
    const rivalName = world.kingdoms.find((k) => k.id === rivalId)?.name ?? "a rival";
    if (action === "declare_war")
      record(annals, state.day, "war", `${playerName} declares war on ${rivalName}.`);
    else if (action === "peace" && res.accepted)
      record(annals, state.day, "peace", `${playerName} makes peace with ${rivalName}.`);
    force();
    return res;
  };

  const selectArmy = (id: string) => {
    setSelArmy((cur) => (cur === id ? null : id));
    setSelProv(null);
  };
  const clickProvince = (id: string) => {
    const army = selArmy ? state.armies.find((a) => a.id === selArmy) : null;
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

  const activeArmy = selArmy ? state.armies.find((a) => a.id === selArmy) : null;

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
              Day {Math.floor(state.day)}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowCouncil((s) => !s);
                setShowDiplo(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="crown" size={13} />
              Council
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiplo((s) => !s);
                setShowCouncil(false);
                setShowSpy(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="scales" size={13} />
              Diplomacy
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSpy((s) => !s);
                setShowCouncil(false);
                setShowDiplo(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="moon" size={13} />
              Spymaster
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMarket((s) => !s);
                setShowCouncil(false);
                setShowDiplo(false);
                setShowSpy(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="market" size={13} />
              Market
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAnnals((s) => !s);
                setShowCouncil(false);
                setShowDiplo(false);
                setShowSpy(false);
                setShowMarket(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="scroll" size={13} />
              Annals
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEstates((s) => !s);
                setShowCouncil(false);
                setShowDiplo(false);
                setShowSpy(false);
                setShowMarket(false);
                setShowAnnals(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="scales" size={13} />
              Estates
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMuster((s) => !s);
                setShowCouncil(false);
                setShowDiplo(false);
                setShowSpy(false);
                setShowMarket(false);
                setShowAnnals(false);
                setShowEstates(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <GameIcon name="swords" size={13} />
              Muster
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            >
              {playing ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearRealm();
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

        <div className="relative min-h-0 flex-1">
          <RealmMap
            world={world}
            armies={state.armies}
            selectedId={selProv}
            selectedArmyId={selArmy}
            onSelect={clickProvince}
            onSelectArmy={selectArmy}
            fog={fog}
            className="h-full w-full"
          />

          <div className="pointer-events-none absolute left-3 top-3 z-20">
            <RealmHud world={world} ledger={ledger} />
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col gap-3">
            {showCouncil && (
              <CouncilPanel
                council={council}
                ctx={{ world, kingdomId: playerId, ledger, armies: state.armies }}
                onClose={() => setShowCouncil(false)}
              />
            )}
            {showDiplo && (
              <DiplomacyPanel
                world={world}
                dip={dip}
                treasury={ledger.treasury}
                evaluate={diploEvaluate}
                onClose={() => setShowDiplo(false)}
              />
            )}
            {showSpy && (
              <SpymasterPanel
                world={world}
                armies={state.armies}
                intel={intel}
                dip={dip}
                treasury={ledger.treasury}
                onPlaceSpy={placeSpyOn}
                onClose={() => setShowSpy(false)}
              />
            )}
            {showMarket && (
              <MarketPanel
                market={market}
                ledger={ledger}
                onTrade={trade}
                onClose={() => setShowMarket(false)}
              />
            )}
            {showAnnals && (
              <AnnalsPanel
                world={world}
                rulers={rulers}
                annals={annals}
                onClose={() => setShowAnnals(false)}
              />
            )}
            {showEstates && (
              <FactionsPanel
                factions={factions}
                tax={ledger.tax}
                onSetTax={(t: TaxRate) => {
                  ledger.tax = t;
                  force();
                }}
                onClose={() => setShowEstates(false)}
              />
            )}
            {showMuster && (
              <MusterPanel
                world={world}
                ledger={ledger}
                armies={state.armies}
                muster={muster}
                day={state.day}
                onRecruit={doRecruit}
                onDrill={doDrill}
                onClose={() => setShowMuster(false)}
              />
            )}
            {activeArmy && (
              <ArmyPanel
                world={world}
                army={activeArmy}
                isPlayer={activeArmy.ownerId === playerId}
                onClose={() => setSelArmy(null)}
              />
            )}
            {!activeArmy &&
              selProv &&
              (() => {
                const prov = world.provinces.find((p) => p.id === selProv);
                const st = prov?.settlementId
                  ? world.settlements.find((s) => s.id === prov.settlementId)
                  : null;
                const mine = prov?.ownerId === playerId && !!st;
                const cost = st ? fortCost(st.fortLevel) : { gold: 0, stone: 0 };
                return (
                  <ProvincePanel
                    world={world}
                    provinceId={selProv}
                    onClose={() => setSelProv(null)}
                    reinforce={
                      mine && st
                        ? {
                            cost,
                            maxed: st.fortLevel >= MAX_FORT,
                            affordable:
                              ledger.treasury >= cost.gold &&
                              (ledger.stores.stone ?? 0) >= cost.stone,
                            onReinforce: () => {
                              reinforce(ledger, st);
                              force();
                            },
                          }
                        : undefined
                    }
                  />
                );
              })()}
            {report && <BattleReport event={report} onClose={() => setReport(null)} />}
          </div>

          {/* a battle the player leads awaits their command */}
          {pendingBattle && pendingArmy && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/50 p-4">
              <BattlePlanCard
                world={world}
                army={pendingArmy}
                pending={pendingBattle}
                onChoose={chooseTactic}
              />
            </div>
          )}

          {/* an event demands the crown's judgement, centre stage */}
          {pendingEvent && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/50 p-4">
              <EventCard
                event={pendingEvent}
                onChoose={(c: Choice) => applyOutcome(ledger, c.outcome(ledger))}
                onDismiss={() => {
                  setPendingEvent(null);
                  setPlaying(true);
                }}
              />
            </div>
          )}

          {/* the chronicle — the world moving on its own */}
          <div className="pointer-events-none absolute bottom-16 left-3 z-20">
            <Chronicle events={chronicleRef.current} playerId={playerId} />
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
              Click your host, then a province to march · heed your Council · your realm autosaves
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
